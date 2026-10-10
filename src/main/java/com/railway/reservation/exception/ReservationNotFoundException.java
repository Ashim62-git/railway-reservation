package com.railway.reservation.exception;

public class ReservationNotFoundException
        extends RuntimeException {

    public ReservationNotFoundException(String message) {
        super(message);
    }
}