const { Kafka, Partitioners } = require('kafkajs');
const { randomUUID } = require('crypto');

const kafka = new Kafka({ clientId: 'trip-story', brokers: ['localhost:9092'] });
const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });

function envelope(eventType, payload) {
    return {
        eventId: randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        payload
    };
}

async function main() {
    await producer.connect();
    const tripId = `trip-${Date.now()}`;

    const events = [
        envelope('TripRequested', { tripId, riderId: 'rider-7' }),
        envelope('DriverOffered', { tripId, driverId: 'driver-4' }),
        envelope('DriverAccepted', { tripId, driverId: 'driver-4', etaSeconds: 240 }),
        envelope('TripStarted', { tripId, driverId: 'driver-4' }),
        envelope('TripEnded', { tripId, riderId: 'rider-7', driverId: 'driver-4', fareCents: 1850, currency: 'CAD' }),
    ];
    for(const event of events){
        const result = await producer.send({
            topic: 'trip-events',
            messages: [{ key: tripId, value: JSON.stringify(event)}]
        })
        console.log(`${event.eventType} -> partition ${result[0].partition}, offset ${result[0].baseOffset}`);
    }

    await producer.disconnect();
}

main();