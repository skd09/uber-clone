# Uber clone: agreed v1 features and build order

## Decisions
- Auth: separate auth-service issuing JWTs (roles: rider, driver). Auth signs with a private key, other services verify with the public key.
- Routing: OSRM in Docker, one city extract only
- Traffic: simulated load (fake riders and drivers) and simulated congestion that multiplies OSRM travel time
- Extras: Stripe test-mode payments, surge pricing, cancel and decline, trip history and ratings, ride types (Standard, XL, Share)
- Platform: Prometheus, Grafana, k6, nginx load balancer, Redis rate limiter

## Services (matches the repo folders)
| Folder | Job | Language |
|---|---|---|
| services/auth-service | Register, login, JWT, roles, login rate limit | Laravel |
| services/rider-service | Rider profile, saved places, ratings | Laravel (phase 5) |
| services/driver-service | Driver profile, vehicle type, online/offline | Laravel |
| services/trip-service | Trip lifecycle, cancel, history, ride types | Laravel (exists) |
| services/payment-service | Stripe test mode, outbox, ledger, retries, DLQ | Laravel |
| services/location-service | Takes driver pings, updates Redis GEO, publishes driver-locations | Node |
| services/routing-service | OSRM path and ETA, plus congestion multiplier (Traffic lives here) | Node |
| services/matching-service | Nearest driver via Redis GEO, offers, declines, next driver | Decide in phase 4 |
| services/pricing-service | Demand and supply per area, surge multiplier | Decide in phase 4 (Kafka Streams candidate) |
| realtime-gateway | Pushes trip and driver updates to the UI (SSE) | Node |
| simulator | Fake riders and drivers moving along real routes | Node |
| frontend | Next.js rider and driver apps (Claude Code builds this) | Next.js |

Infra folders to add when needed: infra/nginx, infra/prometheus, infra/grafana, infra/k6, infra/osrm.

## Build order
1. Done: Kafka foundation, trip publishing, idempotent consumer
2. auth-service, JWT, rider and driver identities. Rate limiter (Redis token bucket) on login. First k6 script to prove the 429s.
3. Drivers online, location-service into Redis GEO, OSRM routing, fare quote and ETA
4. Matching, offers, decline, accept, realtime updates, basic simulator (4a). Trip as 2 replicas behind nginx, Prometheus, first Grafana dashboard, UI starts (4b).
5. Trip lifecycle (start, end, cancel), history, ratings, rider-service
6. Reliability: outbox, retry topics, DLQ, idempotency everywhere. Grafana panels for consumer lag and DLQ size.
7. Stripe payments and ledger
8. Traffic congestion, surge pricing, k6 load tests at scale, find and fix the bottleneck using Grafana
9. Share rides (simplified), Elasticsearch trip search, 3 brokers

## Watch-outs
- Docker memory: give Docker Desktop 8 GB or more.
- OSRM has no live traffic. Congestion is our own multiplier on its duration.
- Share rides is the hardest algorithm, so it goes last.