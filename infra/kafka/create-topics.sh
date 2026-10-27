#!/usr/bin/env bash
set -e

KAFKA="docker exec uc-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092"

for topic in driver-locations trip-events payment-events; do
  $KAFKA --create --if-not-exists --topic "$topic" --partitions 3
done

$KAFKA --list
