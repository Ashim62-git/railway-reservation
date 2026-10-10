package com.railway.reservation.dto;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ReservationRequest {

    private Long passengerId;
    private Long trainId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate journeyDate;

    public ReservationRequest() {
    }

    public ReservationRequest(Long passengerId, Long trainId, LocalDate journeyDate) {
        this.passengerId = passengerId;
        this.trainId = trainId;
        this.journeyDate = journeyDate;
    }

    public Long getPassengerId() {
        return passengerId;
    }

    public void setPassengerId(Long passengerId) {
        this.passengerId = passengerId;
    }

    public Long getTrainId() {
        return trainId;
    }

    public void setTrainId(Long trainId) {
        this.trainId = trainId;
    }

    public LocalDate getJourneyDate() {
        return journeyDate;
    }

    public void setJourneyDate(LocalDate journeyDate) {
        this.journeyDate = journeyDate;
    }
}

