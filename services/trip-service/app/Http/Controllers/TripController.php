<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Kafka\TripEventPublisher;

class TripController extends Controller
{
    public function show(string $id): JsonResponse
    {
        $trip = Trip::findOrFail($id);

        return response()->json([
            'tripId'   => $trip->id,
            'riderId'  => $trip->rider_id,
            'status'   => $trip->status,
            'driverId' => $trip->driver_id,
            'pickup'   => ['lat' => (float) $trip->pickup_lat,  'lng' => (float) $trip->pickup_lng],
            'dropoff'  => ['lat' => (float) $trip->dropoff_lat, 'lng' => (float) $trip->dropoff_lng],
        ]);
    }

    public function store(Request $request, TripEventPublisher $events): JsonResponse
    {
        $data = $request->validate([
            'rider_id' => 'required|string',
            'pickup.lat' => 'required|numeric|between:-90,90',
            'pickup.lng' => 'required|numeric|between:-180,180',
            'dropoff.lat' => 'required|numeric|between:-90,90',
            'dropoff.lng' => 'required|numeric|between:-180,180',
        ]);

        $trip = Trip::create([
            'rider_id' => $data['rider_id'],
            'pickup_lat' => $data['pickup']['lat'],
            'pickup_lng' => $data['pickup']['lng'],
            'dropoff_lat' => $data['dropoff']['lat'],
            'dropoff_lng' => $data['dropoff']['lng'],
            'status' => 'requested'
        ]);

        $events->publish('TripRequested', $trip->id, [
            'tripId' => $trip->id,
            'riderId' => $trip->rider_id,
            'pickup' => [
                'lat' => $data['pickup']['lat'],
                'lng' => $data['pickup']['lng'],
            ],
            'dropoff' => [
                'lat' => $data['dropoff']['lat'],
                'lng' => $data['dropoff']['lng'],
            ],
        ]);

        return response()->json([
            'tripId' => $trip->id,
            'status' => $trip->status
        ], 201);
    }
}
