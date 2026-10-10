package com.railway.reservation.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.railway.reservation.entity.Passenger;
import com.railway.reservation.repository.PassengerRepository;
import com.railway.reservation.repository.ReservationRepository;

@Service
public class PassengerService {

    private final PassengerRepository passengerRepository;
    private final ReservationRepository reservationRepository;

    public PassengerService(
            PassengerRepository passengerRepository,
            ReservationRepository reservationRepository) {
        this.passengerRepository = passengerRepository;
        this.reservationRepository = reservationRepository;
    }

    public Passenger addPassenger(Passenger passenger) {

        if (passengerRepository.findByEmailIgnoreCase(
                passenger.getEmail()).isPresent()) {
            throw new IllegalArgumentException(
                    "Email is already registered");
        }

        return passengerRepository.save(passenger);
    }

    public List<Passenger> getAllPassengers() {
        return passengerRepository.findAll();
    }

    public Passenger getPassengerById(Long id) {
        return passengerRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Passenger not found: " + id));
    }

    public Passenger updatePassenger(
            Long id, Passenger updatedPassenger) {

        Passenger existing = getPassengerById(id);

        if (updatedPassenger.getName() != null) {
            existing.setName(updatedPassenger.getName());
        }

        if (updatedPassenger.getEmail() != null) {

            passengerRepository
                    .findByEmailIgnoreCase(updatedPassenger.getEmail())
                    .filter(p -> !p.getId().equals(id))
                    .ifPresent(p -> {
                        throw new IllegalArgumentException(
                                "Email is already registered");
                    });

            existing.setEmail(updatedPassenger.getEmail());
        }

        if (updatedPassenger.getPhone() != null) {
            existing.setPhone(updatedPassenger.getPhone());
        }

        return passengerRepository.save(existing);
    }

    @Transactional
    public void deletePassenger(Long id) {

        Passenger passenger = getPassengerById(id);

        if (!reservationRepository
                .findByPassengerId(id).isEmpty()) {
            throw new IllegalArgumentException(
                    "Cannot delete a passenger with reservation records");
        }

        passengerRepository.delete(passenger);
    }
}