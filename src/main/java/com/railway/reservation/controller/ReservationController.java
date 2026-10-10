package com.railway.reservation.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;

import com.railway.reservation.dto.ReservationRequest;
import com.railway.reservation.entity.Reservation;
import com.railway.reservation.service.ReservationService;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(
            ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    // Book a ticket (supports both JSON body and query parameters)
    @PostMapping
    public ResponseEntity<Reservation> bookTicket(
            @RequestBody(required = false) ReservationRequest request,
            @RequestParam(required = false) Long passengerId,
            @RequestParam(required = false) Long trainId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate journeyDate) {

        Long effectivePassengerId = (request != null && request.getPassengerId() != null)
                ? request.getPassengerId() : passengerId;
        Long effectiveTrainId = (request != null && request.getTrainId() != null)
                ? request.getTrainId() : trainId;
        LocalDate effectiveJourneyDate = (request != null && request.getJourneyDate() != null)
                ? request.getJourneyDate() : journeyDate;

        if (effectivePassengerId == null || effectiveTrainId == null || effectiveJourneyDate == null) {
            throw new IllegalArgumentException(
                    "passengerId, trainId, and journeyDate are required for booking");
        }

        Reservation reservation =
                reservationService.bookTicket(
                        effectivePassengerId, effectiveTrainId, effectiveJourneyDate);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservation);
    }

    // Get all reservations
    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    // Search using PNR
    @GetMapping("/{pnr}")
    public Reservation getReservationByPnr(
            @PathVariable String pnr) {

        return reservationService.getReservationByPnr(pnr);
    }

    // Get booking history for a passenger
    @GetMapping("/passenger/{passengerId}")
    public List<Reservation> getPassengerReservations(
            @PathVariable Long passengerId) {

        return reservationService
                .getPassengerReservations(passengerId);
    }

    // Cancel a ticket
    @PutMapping("/{pnr}/cancel")
    public Reservation cancelTicket(
            @PathVariable String pnr) {

        return reservationService.cancelTicket(pnr);
    }
}