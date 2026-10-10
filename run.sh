#!/usr/bin/env bash
# Quick launch script for Railway Reservation System in VS Code or Terminal
set -e

cd "$(dirname "$0")"

echo "=========================================================="
echo " Starting Railway Reservation System"
echo "=========================================================="

# Check if PostgreSQL is responding on port 5432
if nc -z 127.0.0.1 5432 2>/dev/null; then
    echo "✔ PostgreSQL detected on port 5432."
else
    echo "⚠ Notice: PostgreSQL not detected on 127.0.0.1:5432."
    echo "  Attempting to check/start PostgreSQL service..."
    if command -v service >/dev/null 2>&1; then
        service postgresql start 2>/dev/null || true
    fi
fi

echo "✔ Starting Spring Boot Application on port 8080..."
echo "  Frontend URL: http://localhost:8080"
echo "  Press Ctrl+C to stop the application."
echo "=========================================================="

./mvnw spring-boot:run

