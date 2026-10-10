package com.railway.reservation.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.railway.reservation.entity.Train;
import com.railway.reservation.repository.ReservationRepository;
import com.railway.reservation.repository.TrainRepository;

@Service
public class TrainService {

    private final TrainRepository trainRepository;
    private final ReservationRepository reservationRepository;

    public TrainService(
            TrainRepository trainRepository,
            ReservationRepository reservationRepository) {
        this.trainRepository = trainRepository;
        this.reservationRepository = reservationRepository;
    }

    public Train addTrain(Train train) {

        if (trainRepository.findByTrainNumber(
                train.getTrainNumber()).isPresent()) {
            throw new IllegalArgumentException(
                    "Train number already exists");
        }

        if (train.getAvailableSeats() > train.getTotalSeats()) {
            throw new IllegalArgumentException(
                    "Available seats cannot exceed total seats");
        }

        return trainRepository.save(train);
    }

    public List<Train> getAllTrains() {
        return trainRepository.findAll();
    }

    public Train getTrainById(Long id) {
        return trainRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Train not found: " + id));
    }

    public List<Train> searchTrains(
            String source, String destination) {

        String src = (source != null) ? source.trim() : "";
        String dst = (destination != null) ? destination.trim() : "";

        if (src.isEmpty() && dst.isEmpty()) {
            return trainRepository.findAll();
        }

        return trainRepository
                .findBySourceContainingIgnoreCaseAndDestinationContainingIgnoreCase(
                        src, dst);
    }

    public Train updateTrain(Long id, Train updatedTrain) {

        Train existing = getTrainById(id);

        if (updatedTrain.getTrainNumber() != null
                && !updatedTrain.getTrainNumber()
                .equals(existing.getTrainNumber())) {

            if (trainRepository.findByTrainNumber(
                    updatedTrain.getTrainNumber()).isPresent()) {
                throw new IllegalArgumentException(
                        "Train number already exists");
            }

            existing.setTrainNumber(updatedTrain.getTrainNumber());
        }

        if (updatedTrain.getTrainName() != null) {
            existing.setTrainName(updatedTrain.getTrainName());
        }

        if (updatedTrain.getSource() != null) {
            existing.setSource(updatedTrain.getSource());
        }

        if (updatedTrain.getDestination() != null) {
            existing.setDestination(updatedTrain.getDestination());
        }

        if (updatedTrain.getTotalSeats() != null) {
            existing.setTotalSeats(updatedTrain.getTotalSeats());
        }

        if (updatedTrain.getAvailableSeats() != null) {
            existing.setAvailableSeats(
                    updatedTrain.getAvailableSeats());
        }

        if (updatedTrain.getDepartureTime() != null) {
            existing.setDepartureTime(
                    updatedTrain.getDepartureTime());
        }

        if (updatedTrain.getArrivalTime() != null) {
            existing.setArrivalTime(
                    updatedTrain.getArrivalTime());
        }

        if (existing.getTotalSeats() <= 0
                || existing.getAvailableSeats() < 0
                || existing.getAvailableSeats()
                > existing.getTotalSeats()) {
            throw new IllegalArgumentException(
                    "Invalid seat count");
        }

        return trainRepository.save(existing);
    }

    @Transactional
    public void deleteTrain(Long id) {

        Train train = getTrainById(id);

        if (reservationRepository.existsByTrainId(id)) {
            throw new IllegalArgumentException(
                    "Cannot delete a train with reservation records");
        }

        trainRepository.delete(train);
    }
}