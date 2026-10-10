package com.railway.reservation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.railway.reservation.entity.Reservation;

public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByPnrNumber(String pnrNumber);

    List<Reservation> findByPassengerId(Long passengerId);

    boolean existsByTrainId(Long trainId);
}