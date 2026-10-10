package com.railway.reservation.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.railway.reservation.entity.Passenger;

public interface PassengerRepository
        extends JpaRepository<Passenger, Long> {

    Optional<Passenger> findByEmailIgnoreCase(String email);
}