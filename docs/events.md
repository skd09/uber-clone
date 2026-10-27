# Event contracts

## Rules

- Events are facts in past tense, named in PascalCase (`TripRequested`).
- Every event uses the envelope below. Payloads are listed per event.
- The Kafka message key is `tripId` on every topic, so one trip's events stay in order.
- Money is a whole number in cents. Put the unit in the field name (`chargedCents`, `etaSeconds`).
- Timestamps are ISO 8601 in UTC.
- Consumers must ignore fields they don't know. Add fields freely, never rename or remove one.

## Envelope (every event)

```json
{
  "eventId": "uuid",
  "eventType": "TripRequested",
  "occurredAt": "2026-10-13T23:12:00Z",
  "payload": {}
}
```

`eventId` is unique per event. Consumers use it to ignore duplicates (week 4).

## Topic: trip-events (key = tripId)

### TripRequested (posted by Trip service)

```json
{
  "tripId": "trip-101",
  "riderId": "rider-7",
  "pickup": { "lat": 49.28, "lng": -123.12 },
  "dropoff": { "lat": 49.25, "lng": -123.0 }
}
```

### DriverOffered (posted by Matching service)

```json
{
  "tripId": "trip-101",
  "driverId": "driver-4",
  "offerExpiresAt": "2026-10-13T23:19:30Z"
}
```

### DriverDeclined (posted by Driver service)

```json
{
  "tripId": "trip-101",
  "driverId": "driver-4"
}
```

### DriverAccepted (posted by Driver service)

```json
{
  "tripId": "trip-101",
  "driverId": "driver-4",
  "etaSeconds": 240
}
```

### TripStarted (posted by Trip service)

```json
{
  "tripId": "trip-101",
  "driverId": "driver-4",
  "startedAt": "2026-10-13T23:30:00Z"
}
```

### TripEnded (posted by Trip service)

```json
{
  "tripId": "trip-101",
  "riderId": "rider-7",
  "driverId": "driver-4",
  "endedAt": "2026-10-13T23:40:00Z",
  "fareCents": 1850,
  "currency": "CAD"
}
```

## Topic: payment-events (key = tripId)

### PaymentSucceeded (posted by Payment service)

```json
{
  "tripId": "trip-101",
  "riderId": "rider-7",
  "driverId": "driver-4",
  "paymentId": "payment-4",
  "chargedCents": 1850,
  "currency": "CAD"
}
```

### PaymentFailed (posted by Payment service)

```json
{
  "tripId": "trip-101",
  "riderId": "rider-7",
  "attemptedCents": 1850,
  "currency": "CAD",
  "reason": "card_declined",
  "retryable": false
}
```

## Topic: driver-locations (key = driverId)

Not a business event, so it skips the envelope for speed.

```json
{
  "driverId": "driver-4",
  "lat": 49.2812,
  "lng": -123.1207,
  "ts": 1760398800000
}
```
