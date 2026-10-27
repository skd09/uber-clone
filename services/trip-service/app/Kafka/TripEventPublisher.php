<?php

namespace App\Kafka;

use Illuminate\Support\Str;
use Junges\Kafka\Facades\Kafka;
use Junges\Kafka\Message\Message;

class TripEventPublisher
{
    public function publish(string $eventType, string $tripId, array $payload): void
    {
        $event = [
            'eventId' => (string) Str::uuid(),
            'eventType' => $eventType,
            'occurredAt' => now()->utc()->toIso8601ZuluString(),
            'payload' => $payload
        ];

        Kafka::publish()
            ->onTopic('trip-events')
            ->withMessage(new Message(body: $event, key: $tripId))
            ->send();
    }
}