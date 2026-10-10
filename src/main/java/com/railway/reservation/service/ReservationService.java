package com.railway.reservation.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.railway.reservation.entity.Passenger;
import com.railway.reservation.entity.Reservation;
import com.railway.reservation.entity.Train;
import com.railway.reservation.exception.ReservationNotFoundException;
import com.railway.reservation.repository.PassengerRepository;
import com.railway.reservation.repository.ReservationRepository;
import com.railway.reservation.repository.TrainRepository;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PassengerRepository passengerRepository;
    private final TrainRepository trainRepository;

    public ReservationService(
            ReservationRepository reservationRepository,
            PassengerRepository passengerRepository,
            TrainRepository trainRepository) {

        this.reservationRepository = reservationRepository;
        this.passengerRepository = passengerRepository;
        this.trainRepository = trainRepository;
    }

    @Transactional
    public Reservation bookTicket(
            Long passengerId,
            Long trainId,
            LocalDate journeyDate) {

        if (journeyDate == null
                || journeyDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Journey date cannot be in the past");
        }

        Passenger passenger = passengerRepository
                .findById(passengerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Passenger not found: " + passengerId));

        Train train = trainRepository.findById(trainId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Train not found: " + trainId));

        if (train.getAvailableSeats() <= 0) {
            throw new IllegalArgumentException(
                    "No seats available on this train");
        }

        int seatNumber =
                train.getTotalSeats() - train.getAvailableSeats() + 1;

        train.setAvailableSeats(train.getAvailableSeats() - 1);

        Reservation reservation = new Reservation();

        reservation.setPnrNumber(generatePnr());
        reservation.setPassenger(passenger);
        reservation.setTrain(train);
        reservation.setJourneyDate(journeyDate);
        reservation.setSeatNumber(seatNumber);
        reservation.setStatus("CONFIRMED");
        reservation.setBookingTime(LocalDateTime.now());

        trainRepository.save(train);

        return reservationRepository.save(reservation);
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Reservation getReservationByPnr(String pnr) {
        return reservationRepository.findByPnrNumber(pnr)
                .orElseThrow(() ->
                        new ReservationNotFoundException(
                                "Reservation not found for PNR: " + pnr));
    }

    public List<Reservation> getPassengerReservations(
            Long passengerId) {

        if (!passengerRepository.existsById(passengerId)) {
            throw new IllegalArgumentException(
                    "Passenger not found: " + passengerId);
        }

        return reservationRepository.findByPassengerId(passengerId);
    }

    @Transactional
    public Reservation cancelTicket(String pnr) {

        Reservation reservation = getReservationByPnr(pnr);

        if ("CANCELLED".equals(reservation.getStatus())) {
            throw new IllegalArgumentException(
                    "Ticket is already cancelled");
        }

        Train train = trainRepository
                .findById(reservation.getTrain().getId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Train not found"));

        reservation.setStatus("CANCELLED");

        train.setAvailableSeats(
                Math.min(
                        train.getAvailableSeats() + 1,
                        train.getTotalSeats()
                )
        );

        trainRepository.save(train);

        return reservationRepository.save(reservation);
    }

    private String generatePnr() {

        String pnr;

        do {
            pnr = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 10)
                    .toUpperCase();
        } while (reservationRepository
                .findByPnrNumber(pnr).isPresent());

        return pnr;
    }
}