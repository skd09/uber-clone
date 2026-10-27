const { Kafka, Partitioners } = require('kafkajs');
const { randomUUID } = require('crypto');

const kafka = new Kafka({ clientId: 'trip-sender', brokers: ['localhost:9092'] });
const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

function envelope(eventType, payload) {
    return {
        eventId: randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        payload,
    };
}

async function main() {
    await producer.connect();
    const tripId = `trip-${Date.now()}`;

    const event = envelope('TripRequested', {
        tripId,
        riderId: 'rider-7',
        pickup: { lat: 49.28, lng: -123.12 },
        dropoff: { lat: 49.25, lng: -123.0 },
    });

    const result = await producer.send({
        topic: 'trip-events',
        messages: [{ key: tripId, value: JSON.stringify(event) }]
    });


    console.log(`${event.eventType} for ${tripId} -> partition ${result[0].partition}`);

    await producer.disconnect();

}

main();