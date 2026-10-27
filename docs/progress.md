# Progress

## Step 1: project skeleton

Created the uber-clone monorepo with docs, infra (kafka, elasticsearch, redis), services (one folder per service), simulator and frontend folders, and ran git init. Each service gets its own folder so it can get its own Dockerfile and dependencies later, and services only talk to each other through Kafka topics.
Interview line: "I structured the monorepo with one folder per service, so each one could be deployed on its own and nothing imports code from another service."

## Step 2: Kafka in Docker (KRaft)

Added docker-compose.yml with apache/kafka 3.8.0 in KRaft mode (one node acting as both broker and controller, no ZooKeeper) and kafka-ui on port 8080. The broker has two client listeners: EXTERNAL on 9092, advertised as localhost:9092 for tools on my Mac, and PLAINTEXT on 29092, advertised as kafka:29092 for other containers. The internal topics' replication factors are set to 1 because there is only one broker. Verified with docker ps (both containers up) and the cluster showing in the UI.
Debugging notes: depends_on needs the service name (kafka), not the container_name (uc-kafka). I also left out KAFKA_CONTROLLER_LISTENER_NAMES at first, and the broker needs it to start.
Interview line: "A broker tells clients which address to reconnect to, so I ran two listeners, localhost for my laptop and the service name for containers, because localhost inside a container means the container itself."

## Step 3: first topic, keys and partitions

Created driver-locations with 3 partitions and used the console producer (key:value) and consumer (print.key, print.partition) to send messages. The same key always landed on the same partition. With only 5 or 6 driver keys, partition 0 stayed empty and partition 1 held 9 of the 12 messages, because hash(key) % partition_count does not spread a handful of keys evenly. The producer library picks the partition, not the broker, and changing the partition count changes where keys land.
Interview line: "I choose the key so everything that must stay in order shares a partition, and I saw that with few keys the load spreads unevenly, which is how a skewed key turns into a hot partition."

## Step 4: consumer groups, offsets and lag

Ran console consumers in a group called matching-test. Each partition went to exactly one consumer, and when one was stopped the survivor took over its partitions (a rebalance). kafka-consumer-groups.sh --describe showed partition 0 at offset 0, partition 1 at 9 and partition 2 at 3, with lag 0 everywhere. Lag is the log end offset minus the current offset: a small steady number is fine, a growing one means consumers are falling behind. The offsets are saved on the broker (in \_\_consumer_offsets), not inside the consumer, which is why a restarted consumer continues where its group stopped.
Interview line: "Offsets live on the broker per consumer group, so when a consumer dies another one resumes from the saved position with no repeats and no gaps, and I watch lag trend to know whether consumers keep up."

## Step 5: Node producer and consumer

Wrote simulator/producer.js and consumer.js with kafkajs against localhost:9092 (the EXTERNAL listener). With 5 driver keys only 2 of the 3 partitions were used. With 50 keys all three were used, split 22/17/11, and identical on every round. Two copies of the consumer in the group node-test split the partitions 2 and 1. Set the DefaultPartitioner to silence the kafkajs v2 warning (it matches the Java client's hashing, so a Node and a Java producer send the same key to the same partition). The TimeoutNegativeWarning printed on this Node version comes from inside kafkajs and is harmless.
Interview line: "More distinct keys even out partition load, and I make every producer use the same partitioner so a key lands on the same partition no matter which language sent it."

## Step 6: event contracts

Wrote docs/events.md before any service code. Every event uses one envelope (eventId, eventType, occurredAt, payload). Events are past-tense facts: TripRequested, DriverOffered, DriverDeclined, DriverAccepted, TripStarted and TripEnded on trip-events, and PaymentSucceeded and PaymentFailed on payment-events, all keyed by tripId. driver-locations is keyed by driverId and skips the envelope. Rules: money is a whole number in cents with the unit in the field name (fareCents, chargedCents, etaSeconds), timestamps are ISO 8601 UTC, and consumers ignore fields they do not know. The typos I made while writing it (a missing colon, fareCEnts) are exactly the bugs a shared contract exists to catch.
Interview line: "Services never call each other, so the event shapes are their API. I wrote the contracts first and keyed trip events by tripId so one trip's events stay ordered in a single partition."

## Step 7: topic script and first real events

infra/kafka/create-topics.sh creates the three topics with --if-not-exists, so it is safe to re-run after a wipe. Debugging notes: a typo in the shebang (/user/bin/env), then an empty topic name from a mistyped loop variable. Rewriting the file fixed both. Sent a TripRequested from Node and read it back with the console consumer. Five separate trips (five different keys) spread across partitions 0, 1 and 2. Then sent a full trip story, five events with one tripId, and all five landed on partition 1 with increasing offsets. The first run of that script printed "0" to "4" as message bodies because the loop used for...in, which gives indexes, instead of for...of.
Interview line: "Ordering is guaranteed per key, not per topic. A trip's events share a key, so the payment service can never see TripEnded before TripStarted, while different trips spread across partitions for parallelism."

## Step 8: Trip service, its own database and trips table

Scaffolded Laravel in services/trip-service with its own MySQL (trip-db, host port 3307, database uc-trip). Debugging notes: my .env and the compose file had different credentials, and the MYSQL\_\* variables only apply when the data volume is first created, so changed credentials need the volume deleted. The trips migration has a uuid primary key (it becomes the Kafka key and exists before the row is saved), rider_id and driver_id as plain strings with no foreign keys because those records live in other services, decimal(10,7) coordinates, status defaulting to requested, and nullable columns for driver, ETA, start and end times, fare_cents and currency that events fill in later. db:table caught a typo (fare_counts), which I fixed in the migration and re-ran with migrate:fresh.
Interview line: "Each service owns its data, so the trips table stores riders and drivers as plain IDs instead of foreign keys, and the trip id is a UUID generated by the service so it can serve as the event key."

## Step 9: POST /trips

Added the Trip model with HasUuids and POST /api/trips. It validates the rider and coordinates (422 on bad input), saves the trip with status requested and returns 201 with the tripId. Only the fields a rider sends are fillable. Driver, fare and timestamps are meant to come from events. The generated ids are time-ordered UUIDs.
Interview line: "I only let the request set the fields a rider owns, so everything else about a trip can change only through events."

## Step 10: Trip service in Docker with rdkafka, PHP to Kafka

PHP needs the rdkafka extension to talk to Kafka. My Mac already has several PHPs (Herd Lite, an Intel PHP under /usr/local, a stale arm64 rdkafka.so), so building the extension on the host would have fought them. Instead services/trip-service/Dockerfile (php:8.4-cli with librdkafka, pecl rdkafka, pdo_mysql, pcntl and composer) is built by a trip-service entry in compose. The code folder is mounted into the container, port 8000 is published, and inside the compose network the service reaches the database as trip-db:3306 and Kafka as kafka:29092. php -m shows rdkafka inside the container. Installed mateusjunges/laravel-kafka (composer runs inside the container) and published a smoke-test message from tinker. The console consumer printed Partition:0, key trip-test and {"hello":"from php"}.
Interview line: "I ran the PHP service in Docker so the Kafka extension is reproducible for every Laravel service, and services reach each other by compose service name, not localhost."
Not done yet: POST /trips does not publish TripRequested (next step is a TripEventPublisher that wraps the envelope and uses tripId as the key). Saving to MySQL and publishing to Kafka are two separate operations, so one can succeed while the other fails, which is what the outbox pattern in the reliability phase solves. Also not started: Rider, Driver, Matching, Location and Payment services, Elasticsearch and Redis geo matching, surge pricing, and the map UI.

## Step 11: POST /trips publishes TripRequested

Added app/Kafka/TripEventPublisher.php, which wraps any payload in the standard envelope (eventId, eventType, occurredAt, payload) and publishes it to trip-events with the tripId as the Kafka key. TripController::store now saves the trip, then publishes TripRequested using the validated request values for the coordinates, so they stay numbers (Eloquent returns decimal columns as strings). Verified the event arrives on trip-events keyed by tripId.
Debugging notes: the first error (Undefined constant RD_KAFKA_PARTITION_UA) came from the old php artisan serve on my Mac still holding port 8000, which has no rdkafka. The Docker container was mapped to 8002. The clue was the file paths in the stack trace: /Users/... is the Mac, /var/www/html is the container. The second error (Connection refused on 127.0.0.1:3307) happened because the container read the Mac values from .env. Inside the container the database is trip-db:3306, so the compose service needs environment values for DB_HOST, DB_PORT and KAFKA_BROKERS (kafka:29092), which override .env.
Interview line: "The same service code runs on my laptop and in Docker because connection settings come from environment variables, and I debug 'wrong server' problems by reading the file paths in the stack trace."
Not done yet: saving to MySQL and publishing to Kafka are two separate operations, so one can succeed while the other fails, and the trip and its event can disagree. That is what the outbox pattern in the reliability phase fixes. Also not started: Rider, Driver, Matching, Location and Payment services, Elasticsearch and Redis geo matching, surge pricing, and the map UI.
