const { Kafka, Partitioners } = require('kafkajs')

const kafka = new Kafka({
    clientId: 'driver-simulator',
    brokers: ['localhost:9092']
});

const producer = kafka.producer({createPartitioner: Partitioners.DefaultPartitioner});

const drivers = Array.from({ length: 10 }, (_, i) => `driver-${i + 1}`);

function makePing(driverId) {
    return {
        driverId,
        lat: 49.28 + (Math.random() - 0.5) * 0.05,
        lng: -123.12 + (Math.random() - 0.5) * 0.05,
        ts: Date.now(),
    }
}

async function main() {
    await producer.connect();
    console.log('driver-locations');
    setInterval(async () => {
        for(const id of drivers) {
            const result = await producer.send({
                topic: 'driver-locations',
                messages: [{key: id, value: JSON.stringify(makePing(id))}]
            });
            console.log(`${id} -> partition ${result[0].partition}`)
        }
    }, 1000);
}

process.on('SIGINT', async () => {
    await producer.disconnect();
    process.exit(0);
});

main();