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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.railway.reservation.entity.Train;
import com.railway.reservation.service.TrainService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/trains")
public class TrainController {

    private final TrainService trainService;

    public TrainController(TrainService trainService) {
        this.trainService = trainService;
    }

    @PostMapping
    public ResponseEntity<Train> addTrain(
            @Valid @RequestBody Train train) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainService.addTrain(train));
    }

    @GetMapping
    public List<Train> getAllTrains() {
        return trainService.getAllTrains();
    }

    @GetMapping("/{id}")
    public Train getTrainById(@PathVariable Long id) {
        return trainService.getTrainById(id);
    }

    @GetMapping("/search")
    public List<Train> searchTrains(
            @RequestParam(required = false, defaultValue = "") String source,
            @RequestParam(required = false, defaultValue = "") String destination) {

        return trainService.searchTrains(source, destination);
    }

    @PutMapping("/{id}")
    public Train updateTrain(
            @PathVariable Long id,
            @RequestBody Train train) {

        return trainService.updateTrain(id, train);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteTrain(
            @PathVariable Long id) {

        trainService.deleteTrain(id);

        return ResponseEntity.ok("Train deleted successfully");
    }
}