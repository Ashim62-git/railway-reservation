package com.railway.reservation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.railway.reservation.entity.Passenger;
import com.railway.reservation.service.PassengerService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/passengers")
public class PassengerController {

    private final PassengerService passengerService;

    public PassengerController(PassengerService passengerService) {
        this.passengerService = passengerService;
    }

    @PostMapping
    public ResponseEntity<Passenger> addPassenger(
            @Valid @RequestBody Passenger passenger) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(passengerService.addPassenger(passenger));
    }

    @GetMapping
    public List<Passenger> getAllPassengers() {
        return passengerService.getAllPassengers();
    }

    @GetMapping("/{id}")
    public Passenger getPassengerById(@PathVariable Long id) {
        return passengerService.getPassengerById(id);
    }

    @PutMapping("/{id}")
    public Passenger updatePassenger(
            @PathVariable Long id,
            @Valid @RequestBody Passenger passenger) {

        return passengerService.updatePassenger(id, passenger);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deletePassenger(
            @PathVariable Long id) {

        passengerService.deletePassenger(id);

        return ResponseEntity.ok("Passenger deleted successfully");
    }
}