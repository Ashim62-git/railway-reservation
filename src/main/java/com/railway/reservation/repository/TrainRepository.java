package com.railway.reservation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.railway.reservation.entity.Train;

public interface TrainRepository extends JpaRepository<Train, Long> {

    Optional<Train> findByTrainNumber(String trainNumber);

    List<Train> findBySourceIgnoreCaseAndDestinationIgnoreCase(
        String source,
        String destination
    );

    List<Train> findBySourceContainingIgnoreCaseAndDestinationContainingIgnoreCase(
        String source,
        String destination
    );
}