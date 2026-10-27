# Uber clone (Kafka microservices)

A ride-hailing backend built to learn Kafka, microservices, geo matching, and payments. Backend is hand-written. Only the Next.js map UI is generated.

## Layout

| Folder                                                        | What it is                                              |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `services/trip-service`                                       | Laravel, owns trips, publishes trip events              |
| `services/rider-service`, `driver-service`, `payment-service` | Laravel, not started                                    |
| `services/location-service`, `matching-service`               | Node or Java, decided in week 3                         |
| `simulator/`                                                  | Node scripts that fake drivers and send events          |
| `infra/kafka/`                                                | Topic creation script                                   |
| `docs/events.md`                                              | Event contracts, the source of truth for message shapes |
| `docs/progress.md`                                            | What is done and what is next                           |

## Run it

```bash
docker compose up -d
./infra/kafka/create-topics.sh
cd services/trip-service && php artisan serve
```

Kafka UI: http://localhost:8080. Trip database: MySQL on port 3307.

## Rules

- Services talk only through Kafka topics. Nobody reads another service's database.
- Event shapes live in `docs/events.md`. Change the contract first, then the code.
