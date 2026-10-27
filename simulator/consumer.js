const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'location-printer',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'node-test' });

async function main() {
    await consumer.connect();
    await consumer.subscribe({
        topic: 'driver-locations',
        fromBeginning: false
    });

    await consumer.run({
        eachMessage: async ({ partition, message}) => {
            const ping = JSON.parse(message.value.toString());
            console.log(
                `partition ${partition} | offset ${message.offset} | ${message.key.toString()} | ${ping.lat.toFixed(4)}, ${ping.lng.toFixed(4)}`
            );
        }
    });
}

process.on('SIGINT', async () => {
    await consumer.disconnect();
    process.exit(0);
});

main();