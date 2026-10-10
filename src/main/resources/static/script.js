// Dynamically resolve API URL
const API = (window.location.protocol.startsWith("http") && window.location.port === "8080")
    ? window.location.origin
    : "http://localhost:8080";

// State
let allTrains = [];
let filteredTrains = [];
let allPassengers = [];
let allReservations = [];

let currentSearch = {
    source: "Chennai Egmore",
    destination: "Tirunelveli",
    date: "2026-10-15",
    passengersCount: 1
};

// Filter states
let activeTimeFilters = new Set();
let selectedTrainClasses = {}; // map trainId -> { className, fare }
let activeReservationFilter = "ALL";

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    initDefaultSearchDate();
    loadInitialData();
});

function initDefaultSearchDate() {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 6);
    currentSearch.date = futureDate.toISOString().split("T")[0];

    updateBannerTexts();

    const modalDate = document.getElementById("modalDateInput");
    if (modalDate) {
        modalDate.min = today.toISOString().split("T")[0];
        modalDate.value = currentSearch.date;
    }
}

function updateBannerTexts() {
    document.getElementById("bannerSourceText").textContent = currentSearch.source;
    document.getElementById("bannerDestText").textContent = currentSearch.destination;
    document.getElementById("bannerDateText").textContent = formatDisplayDate(currentSearch.date);
    document.getElementById("bannerPassengerCountText").textContent = `${currentSearch.passengersCount} Passenger`;
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll(".re-page").forEach(p => p.classList.add("d-none"));
    document.querySelectorAll(".re-nav-links .nav-link").forEach(l => l.classList.remove("active-pill"));

    if (pageId === "search") {
        document.getElementById("searchPage").classList.remove("d-none");
        document.getElementById("navSearchLink")?.classList.add("active-pill");
    } else if (pageId === "bookings") {
        document.getElementById("bookingsPage").classList.remove("d-none");
        document.getElementById("navBookingsLink")?.classList.add("active-pill");
        loadAllReservations();
    } else if (pageId === "pnr") {
        document.getElementById("pnrPage").classList.remove("d-none");
        document.getElementById("navPnrLink")?.classList.add("active-pill");
    } else if (pageId === "admin") {
        document.getElementById("adminPage").classList.remove("d-none");
        document.getElementById("navAdminLink")?.classList.add("active-pill");
        loadAdminDashboard();
    } else if (pageId === "help") {
        document.getElementById("helpPage").classList.remove("d-none");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Initial Data Load
async function loadInitialData() {
    await Promise.allSettled([
        fetchPassengers(),
        fetchAndSearchTrains(currentSearch.source, currentSearch.destination)
    ]);
}

/* ==========================================================================
   TRAIN SEARCH & FILTERING (Faithful to Reference Design)
   ========================================================================== */

async function fetchAndSearchTrains(source, destination) {
    const container = document.getElementById("trainsListContainer");
    container.innerHTML = `
        <div class="re-card text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-muted">Fetching trains for ${escapeHtml(source)} ➔ ${escapeHtml(destination)}...</p>
        </div>`;

    try {
        let url = `${API}/api/trains/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;
        let res = await fetch(url);
        let list = await res.json();

        // If no direct trains found on custom search, fall back to all trains
        if (!list || list.length === 0) {
            const allRes = await fetch(`${API}/api/trains`);
            allTrains = await allRes.json();
            filteredTrains = [...allTrains];
        } else {
            allTrains = list;
            filteredTrains = [...allTrains];
        }

        applyFilters();
    } catch (err) {
        container.innerHTML = `
            <div class="alert alert-danger shadow-sm">
                <i class="fa-solid fa-triangle-exclamation me-2"></i> Error loading trains: ${escapeHtml(err.message)}
            </div>`;
    }
}

function applyFilters() {
    const directOnly = document.getElementById("directTrainsToggle")?.checked ?? true;
    const availOnly = document.getElementById("availOnlyCheck")?.checked ?? false;

    // Train types checked
    const checkedTypes = Array.from(document.querySelectorAll('.re-checkbox-item input:checked'))
        .map(cb => cb.value.toLowerCase())
        .filter(v => v !== "on");

    let result = allTrains.filter(train => {
        // Availability filter
        if (availOnly && train.availableSeats <= 0) return false;

        // Train type filter
        if (checkedTypes.length > 0) {
            const tName = (train.trainName || "").toLowerCase();
            const matchesType = checkedTypes.some(type => tName.includes(type));
            if (!matchesType) return false;
        }

        // Time slot filter
        if (activeTimeFilters.size > 0 && train.departureTime) {
            const hour = parseInt(train.departureTime.split(":")[0], 10);
            let inSlot = false;
            if (activeTimeFilters.has("morning") && hour >= 6 && hour < 12) inSlot = true;
            if (activeTimeFilters.has("afternoon") && hour >= 12 && hour < 18) inSlot = true;
            if (activeTimeFilters.has("evening") && hour >= 18 && hour < 24) inSlot = true;
            if (activeTimeFilters.has("night") && (hour >= 0 && hour < 6)) inSlot = true;
            if (!inSlot) return false;
        }

        return true;
    });

    // Apply sorting
    const sortVal = document.getElementById("sortSelect")?.value || "departure-asc";
    result.sort((a, b) => {
        if (sortVal === "departure-asc") return (a.departureTime || "").localeCompare(b.departureTime || "");
        if (sortVal === "departure-desc") return (b.departureTime || "").localeCompare(a.departureTime || "");
        if (sortVal === "seats-desc") return (b.availableSeats || 0) - (a.availableSeats || 0);
        return 0;
    });

    filteredTrains = result;
    renderTrainCards(filteredTrains);
}

function renderTrainCards(trains) {
    const container = document.getElementById("trainsListContainer");
    const countBadge = document.getElementById("bannerTrainsCount");
    const showingText = document.getElementById("showingCountText");

    countBadge.textContent = `${trains.length} Trains Found`;
    showingText.textContent = `Showing ${trains.length} of ${allTrains.length} available trains`;

    if (trains.length === 0) {
        container.innerHTML = `
            <div class="re-card text-center py-5">
                <i class="fa-solid fa-train fa-3x text-muted mb-3 opacity-50"></i>
                <h5 class="fw-bold">No Trains Match Your Filters</h5>
                <p class="text-muted small">Try unchecking some filters or resetting the search.</p>
                <button class="btn btn-outline-dark btn-sm rounded-pill" onclick="resetAllFilters()">Reset Filters</button>
            </div>`;
        return;
    }

    let html = "";
    trains.forEach((train, index) => {
        const initial = (train.trainName || "T").trim().charAt(0).toUpperCase();
        let avatarClass = "re-avatar-dark";
        if (initial === "A") avatarClass = "re-avatar-blue";
        else if (initial === "V") avatarClass = "re-avatar-teal";

        // Duration calculation
        const durationStr = calculateDuration(train.departureTime, train.arrivalTime);

        // Train class packages
        const classes = getTrainClassOptions(train);

        const currentSelected = selectedTrainClasses[train.id] || null;

        html += `
            <div class="re-train-card">
                <!-- Card Header -->
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="re-train-avatar ${avatarClass}">
                            ${initial}
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <h3 class="re-train-name mb-0">${escapeHtml(train.trainName)}</h3>
                                <span class="re-train-number-badge">#${escapeHtml(train.trainNumber)}</span>
                            </div>
                            <div class="re-train-status-text">
                                Runs Daily • <span class="text-success fw-semibold">On Time</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <a href="#" class="re-view-details-link" onclick="openTrainDetailsModal(${train.id}); return false;">
                            <span>View Details</span>
                            <i class="fa-solid fa-arrow-trend-up"></i>
                        </a>
                    </div>
                </div>

                <!-- Middle Route Timeline -->
                <div class="re-route-timeline">
                    <!-- Departure -->
                    <div class="re-station-side">
                        <div class="re-station-label">Departure</div>
                        <div class="re-station-time">${formatTimeAmPm(train.departureTime)}</div>
                        <div class="re-station-name">${escapeHtml(train.source)} (MS)</div>
                    </div>

                    <!-- Middle Line -->
                    <div class="re-timeline-center">
                        <div class="re-duration-text">${durationStr}</div>
                        <div class="re-timeline-track">
                            <span class="re-timeline-dot left"></span>
                            <div class="re-timeline-line"></div>
                            <i class="fa-solid fa-train re-timeline-train-icon"></i>
                            <span class="re-timeline-dot right"></span>
                        </div>
                        <div class="re-direct-route">Direct Route</div>
                    </div>

                    <!-- Arrival -->
                    <div class="re-station-side text-end">
                        <div class="re-station-label">Arrival</div>
                        <div class="re-station-time">${formatTimeAmPm(train.arrivalTime)}</div>
                        <div class="re-station-name">${escapeHtml(train.destination)} (TEN)</div>
                    </div>
                </div>

                <!-- Class Selection Cards -->
                <div class="mt-2">
                    <div class="re-filter-label mb-2">Select Class</div>
                    <div class="re-class-cards-container">
                        ${classes.map(c => {
                            const isSelected = currentSelected && currentSelected.className === c.name;
                            const isWaitlist = c.status.startsWith("WL");
                            return `
                                <div class="re-class-card ${isSelected ? 'selected' : ''}" 
                                     onclick="selectClassForTrain(${train.id}, '${escapeHtml(c.name)}', ${c.fare})">
                                    <div class="re-class-header">
                                        <span>${escapeHtml(c.name)}</span>
                                        <span>₹${c.fare.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div class="re-class-footer">
                                        <span class="${isWaitlist ? 're-wl-orange' : 're-avl-green'}">${c.status}</span>
                                        <span class="re-old-price">₹${c.fare.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>

                <!-- Action Bar -->
                <div class="re-card-action-bar">
                    <div class="re-selected-text">
                        Selected: <strong>${currentSelected ? `${currentSelected.className} - ₹${currentSelected.fare}` : 'None'}</strong>
                    </div>
                    <div>
                        <button class="re-book-btn ${currentSelected ? 'active-book' : ''}" 
                                onclick="handleTrainCardBooking(${train.id})">
                            Book Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Class options helper generating realistic class cards matching the reference image
function getTrainClassOptions(train) {
    const tName = (train.trainName || "").toLowerCase();
    const seats = train.availableSeats || 0;

    if (tName.includes("vaigai")) {
        return [
            { name: "AC Chair Car (CC)", fare: 625, status: `AVL ${Math.min(seats, 112)}` },
            { name: "Exec. Chair Car (EC)", fare: 1250, status: `AVL ${Math.max(1, Math.floor(seats / 3))}` }
        ];
    } else if (tName.includes("ananthapuri")) {
        return [
            { name: "Sleeper (SL)", fare: 410, status: `AVL ${Math.min(seats, 12)}` },
            { name: "3 AC (3A)", fare: 1090, status: `AVL ${Math.max(1, Math.floor(seats / 3))}` },
            { name: "2 AC (2A)", fare: 1590, status: `AVL ${Math.max(1, Math.floor(seats / 6))}` }
        ];
    } else {
        // Default / Nellai Superfast
        return [
            { name: "Sleeper (SL)", fare: 385, status: `AVL ${Math.min(seats, 42)}` },
            { name: "3 AC (3A)", fare: 1020, status: `AVL ${Math.max(1, Math.floor(seats / 2))}` },
            { name: "2 AC (2A)", fare: 1480, status: `AVL ${Math.max(1, Math.floor(seats / 5))}` },
            { name: "1 AC (1A)", fare: 2490, status: "WL 4" }
        ];
    }
}

function selectClassForTrain(trainId, className, fare) {
    selectedTrainClasses[trainId] = { className, fare };
    renderTrainCards(filteredTrains);
}

function handleTrainCardBooking(trainId) {
    const train = allTrains.find(t => t.id === trainId);
    if (!train) return;

    const classInfo = selectedTrainClasses[trainId] || { className: "Sleeper (SL)", fare: 385 };
    openBookingModal(train, classInfo);
}

// Modify Search Modal
function openModifySearchModal() {
    document.getElementById("modalSourceInput").value = currentSearch.source;
    document.getElementById("modalDestInput").value = currentSearch.destination;
    document.getElementById("modalDateInput").value = currentSearch.date;
    const modal = new bootstrap.Modal(document.getElementById("modifySearchModal"));
    modal.show();
}

function swapModalStations() {
    const s = document.getElementById("modalSourceInput");
    const d = document.getElementById("modalDestInput");
    const temp = s.value;
    s.value = d.value;
    d.value = temp;
}

function handleModifySearchSubmit(event) {
    event.preventDefault();
    currentSearch.source = document.getElementById("modalSourceInput").value.trim();
    currentSearch.destination = document.getElementById("modalDestInput").value.trim();
    currentSearch.date = document.getElementById("modalDateInput").value;

    updateBannerTexts();
    bootstrap.Modal.getInstance(document.getElementById("modifySearchModal")).hide();

    fetchAndSearchTrains(currentSearch.source, currentSearch.destination);
}

// Time filter toggle
function toggleTimeFilter(el, timeSlot) {
    if (activeTimeFilters.has(timeSlot)) {
        activeTimeFilters.delete(timeSlot);
        el.classList.remove("active");
    } else {
        activeTimeFilters.add(timeSlot);
        el.classList.add("active");
    }
    applyFilters();
}

function resetAllFilters() {
    activeTimeFilters.clear();
    document.querySelectorAll(".re-time-filter-box").forEach(b => b.classList.remove("active"));
    document.getElementById("directTrainsToggle").checked = true;
    document.getElementById("availOnlyCheck").checked = false;
    document.querySelectorAll(".re-checkbox-item input").forEach(cb => cb.checked = true);
    applyFilters();
}

function handleSortChange() {
    applyFilters();
}

/* ==========================================================================
   BOOKING TICKET MODAL & API INTEGRATION
   ========================================================================== */

let activeBookingTrain = null;
let activeBookingClass = null;

function openBookingModal(train, classInfo) {
    activeBookingTrain = train;
    activeBookingClass = classInfo;

    const strip = document.getElementById("modalTrainStrip");
    strip.innerHTML = `
        <div>
            <span class="re-train-number-badge">#${escapeHtml(train.trainNumber)}</span>
            <strong class="ms-1 text-dark">${escapeHtml(train.trainName)}</strong>
            <div class="text-muted small">${escapeHtml(train.source)} ➔ ${escapeHtml(train.destination)}</div>
        </div>
        <div class="text-end">
            <span class="badge bg-success">${train.availableSeats} Seats Available</span>
        </div>
    `;

    document.getElementById("modalSelectedClass").value = `${classInfo.className} - ₹${classInfo.fare}`;
    document.getElementById("modalBaseFare").textContent = `₹${classInfo.fare.toLocaleString('en-IN')}`;
    document.getElementById("modalTotalFare").textContent = `₹${classInfo.fare.toLocaleString('en-IN')}`;
    document.getElementById("modalBookingDate").value = currentSearch.date;

    populatePassengerDropdown();

    const modal = new bootstrap.Modal(document.getElementById("bookingModal"));
    modal.show();
}

function populatePassengerDropdown() {
    const select = document.getElementById("modalPassengerSelect");
    select.innerHTML = '<option value="">-- Choose Passenger --</option>';

    allPassengers.forEach(p => {
        select.innerHTML += `<option value="${p.id}">#${p.id} - ${escapeHtml(p.name)} (${escapeHtml(p.phone)})</option>`;
    });
}

async function handleModalBookingSubmit(event) {
    event.preventDefault();
    if (!activeBookingTrain) return;

    const passengerId = document.getElementById("modalPassengerSelect").value;
    const journeyDate = document.getElementById("modalBookingDate").value;
    const confirmBtn = document.getElementById("modalConfirmBookBtn");

    if (!passengerId) {
        showToast("Please choose a passenger from the list", "warning");
        return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Confirming...';

    const payload = {
        passengerId: parseInt(passengerId),
        trainId: activeBookingTrain.id,
        journeyDate: journeyDate
    };

    try {
        const res = await fetch(`${API}/api/reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Booking failed");

        bootstrap.Modal.getInstance(document.getElementById("bookingModal")).hide();
        showToast(`Ticket Confirmed! PNR: ${data.pnrNumber}`, "success");

        renderTicketSuccessModal(data);

        // Refresh trains to update seat counts
        await fetchAndSearchTrains(currentSearch.source, currentSearch.destination);

    } catch (err) {
        showToast(err.message, "danger");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check-circle me-1"></i> Confirm & Book Ticket';
    }
}

function renderTicketSuccessModal(res) {
    const body = document.getElementById("ticketSuccessBody");
    body.innerHTML = `
        <div class="re-ticket-pass">
            <div class="re-ticket-header">
                <div>
                    <span class="badge bg-warning text-dark mb-1">RAILEASE CONFIRMED E-TICKET</span>
                    <div class="re-ticket-pnr">${escapeHtml(res.pnrNumber)}</div>
                </div>
                <div>
                    <span class="re-status-confirmed"><i class="fa-solid fa-check me-1"></i> ${res.status}</span>
                </div>
            </div>
            <div class="re-ticket-body">
                <div class="row align-items-center mb-3">
                    <div class="col-sm-8">
                        <span class="re-train-number-badge">#${res.train ? res.train.trainNumber : ''}</span>
                        <h4 class="fw-bold mb-1 text-dark">${escapeHtml(res.train ? res.train.trainName : '')}</h4>
                        <div class="text-muted small">${escapeHtml(res.train ? res.train.source : '')} ➔ ${escapeHtml(res.train ? res.train.destination : '')}</div>
                    </div>
                    <div class="col-sm-4 text-sm-end">
                        <div class="re-seat-box">
                            <small class="text-muted text-uppercase fw-bold">Assigned Seat</small>
                            <div class="re-seat-num">#${res.seatNumber}</div>
                        </div>
                    </div>
                </div>
                <div class="re-ticket-divider"></div>
                <div class="row g-3">
                    <div class="col-6 col-md-3">
                        <small class="text-muted text-uppercase fw-bold">Journey Date</small>
                        <div class="fw-bold text-dark">${formatDisplayDate(res.journeyDate)}</div>
                    </div>
                    <div class="col-6 col-md-3">
                        <small class="text-muted text-uppercase fw-bold">Departure</small>
                        <div class="fw-bold text-dark">${formatTimeAmPm(res.train ? res.train.departureTime : '')}</div>
                    </div>
                    <div class="col-6 col-md-3">
                        <small class="text-muted text-uppercase fw-bold">Passenger</small>
                        <div class="fw-bold text-dark">${escapeHtml(res.passenger ? res.passenger.name : '')}</div>
                    </div>
                    <div class="col-6 col-md-3">
                        <small class="text-muted text-uppercase fw-bold">Phone</small>
                        <div class="fw-bold text-dark">${escapeHtml(res.passenger ? res.passenger.phone : '')}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const modal = new bootstrap.Modal(document.getElementById("ticketSuccessModal"));
    modal.show();
}

/* ==========================================================================
   PASSENGERS (Modal Registration & Directory)
   ========================================================================== */

async function fetchPassengers() {
    try {
        const res = await fetch(`${API}/api/passengers`);
        if (res.ok) {
            allPassengers = await res.json();
            // Filter out any passenger named "Ashim Kumar" just in case
            allPassengers = allPassengers.filter(p => p.name !== "Ashim Kumar");
        }
    } catch (e) {
        console.error(e);
    }
}

function openPassengerModal() {
    const modal = new bootstrap.Modal(document.getElementById("passengerModal"));
    modal.show();
    loadPassengersList();
}

async function handleRegisterPassengerSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("regSubmitBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Registering...';

    const pData = {
        name: document.getElementById("regPassengerName").value.trim(),
        email: document.getElementById("regPassengerEmail").value.trim(),
        phone: document.getElementById("regPassengerPhone").value.trim()
    };

    try {
        const res = await fetch(`${API}/api/passengers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        showToast(`Passenger #${data.id} (${data.name}) registered!`, "success");
        document.getElementById("regPassengerName").value = "";
        document.getElementById("regPassengerEmail").value = "";
        document.getElementById("regPassengerPhone").value = "";

        await fetchPassengers();
        loadPassengersList();

        // Switch to directory tab
        const dirTab = document.querySelector('#passengerTabs button[data-bs-target="#tabDirectory"]');
        if (dirTab) dirTab.click();

    } catch (err) {
        showToast(err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Register Passenger";
    }
}

async function loadPassengersList() {
    const container = document.getElementById("modalPassengersListContainer");
    await fetchPassengers();

    if (!allPassengers || allPassengers.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No passengers registered yet.</p>';
        return;
    }

    let html = `
        <table class="table table-hover align-middle mb-0">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                </tr>
            </thead>
            <tbody>`;
    allPassengers.forEach(p => {
        html += `
            <tr>
                <td><span class="badge bg-light text-dark border">#${p.id}</span></td>
                <td class="fw-bold">${escapeHtml(p.name)}</td>
                <td class="text-muted small">${escapeHtml(p.email)}</td>
                <td class="font-monospace small">${escapeHtml(p.phone)}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

/* ==========================================================================
   MY BOOKINGS & PNR STATUS
   ========================================================================== */

async function loadAllReservations() {
    const container = document.getElementById("reservationsTableContainer");
    container.innerHTML = '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Loading...</div>';

    try {
        const res = await fetch(`${API}/api/reservations`);
        if (!res.ok) throw new Error("Failed to load reservations");
        allReservations = await res.json();
        renderReservationsTable();
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    }
}

function setReservationFilter(status, btn) {
    activeReservationFilter = status;
    if (btn) {
        btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    }
    renderReservationsTable();
}

function filterReservationsTable() {
    renderReservationsTable();
}

function renderReservationsTable() {
    const container = document.getElementById("reservationsTableContainer");
    const search = (document.getElementById("reservationSearchInput")?.value || "").toLowerCase().trim();

    let list = allReservations || [];
    if (activeReservationFilter !== "ALL") {
        list = list.filter(r => r.status === activeReservationFilter);
    }
    if (search) {
        list = list.filter(r => 
            (r.pnrNumber && r.pnrNumber.toLowerCase().includes(search)) ||
            (r.passenger && r.passenger.name && r.passenger.name.toLowerCase().includes(search))
        );
    }

    if (list.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No reservations match filter criteria.</p>';
        return;
    }

    let html = `
        <table class="table table-hover align-middle mb-0">
            <thead>
                <tr>
                    <th>PNR</th>
                    <th>Passenger</th>
                    <th>Train</th>
                    <th>Journey Date</th>
                    <th>Seat</th>
                    <th>Status</th>
                    <th class="text-end">Action</th>
                </tr>
            </thead>
            <tbody>`;

    list.forEach(r => {
        const isConfirmed = r.status === "CONFIRMED";
        html += `
            <tr>
                <td><strong class="font-monospace text-primary">${escapeHtml(r.pnrNumber)}</strong></td>
                <td>
                    <div class="fw-bold">${escapeHtml(r.passenger ? r.passenger.name : 'N/A')}</div>
                    <div class="text-muted small">${escapeHtml(r.passenger ? r.passenger.phone : '')}</div>
                </td>
                <td>
                    <div class="fw-semibold">#${r.train ? r.train.trainNumber : ''} ${escapeHtml(r.train ? r.train.trainName : '')}</div>
                    <div class="text-muted small">${escapeHtml(r.train ? r.train.source : '')} ➔ ${escapeHtml(r.train ? r.train.destination : '')}</div>
                </td>
                <td>${formatDisplayDate(r.journeyDate)}</td>
                <td><span class="badge bg-secondary">#${r.seatNumber}</span></td>
                <td>
                    <span class="${isConfirmed ? 're-status-confirmed' : 're-status-cancelled'}">
                        ${r.status}
                    </span>
                </td>
                <td class="text-end">
                    ${isConfirmed ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelReservation('${r.pnrNumber}')">
                            Cancel
                        </button>` : '<span class="text-muted small">None</span>'}
                </td>
            </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function cancelReservation(pnr) {
    if (!confirm(`Are you sure you want to cancel ticket PNR: ${pnr}?`)) return;

    try {
        const res = await fetch(`${API}/api/reservations/${encodeURIComponent(pnr)}/cancel`, { method: "PUT" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cancellation failed");

        showToast(`Ticket ${pnr} cancelled successfully.`, "success");
        await loadAllReservations();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handlePnrLookup(event) {
    event.preventDefault();
    const pnr = document.getElementById("pnrInputBox").value.trim().toUpperCase();
    const resultBox = document.getElementById("pnrResultCard");

    resultBox.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

    try {
        const res = await fetch(`${API}/api/reservations/${encodeURIComponent(pnr)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `No booking found for PNR: ${pnr}`);

        const isConfirmed = data.status === "CONFIRMED";
        resultBox.innerHTML = `
            <div class="re-ticket-pass mt-3">
                <div class="re-ticket-header">
                    <div>
                        <span class="badge bg-warning text-dark mb-1">E-TICKET DETAILS</span>
                        <div class="re-ticket-pnr">${escapeHtml(data.pnrNumber)}</div>
                    </div>
                    <div>
                        <span class="${isConfirmed ? 're-status-confirmed' : 're-status-cancelled'}">${data.status}</span>
                    </div>
                </div>
                <div class="re-ticket-body">
                    <div class="row align-items-center mb-3">
                        <div class="col-sm-8">
                            <span class="re-train-number-badge">#${data.train ? data.train.trainNumber : ''}</span>
                            <h4 class="fw-bold mb-1 text-dark">${escapeHtml(data.train ? data.train.trainName : '')}</h4>
                            <div class="text-muted small">${escapeHtml(data.train ? data.train.source : '')} ➔ ${escapeHtml(data.train ? data.train.destination : '')}</div>
                        </div>
                        <div class="col-sm-4 text-sm-end">
                            <div class="re-seat-box">
                                <small class="text-muted text-uppercase fw-bold">Seat</small>
                                <div class="re-seat-num">#${data.seatNumber}</div>
                            </div>
                        </div>
                    </div>
                    <div class="re-ticket-divider"></div>
                    <div class="row g-3">
                        <div class="col-6 col-md-3">
                            <small class="text-muted text-uppercase fw-bold">Journey Date</small>
                            <div class="fw-bold text-dark">${formatDisplayDate(data.journeyDate)}</div>
                        </div>
                        <div class="col-6 col-md-3">
                            <small class="text-muted text-uppercase fw-bold">Passenger</small>
                            <div class="fw-bold text-dark">${escapeHtml(data.passenger ? data.passenger.name : '')}</div>
                        </div>
                        <div class="col-6 col-md-3">
                            <small class="text-muted text-uppercase fw-bold">Phone</small>
                            <div class="fw-bold text-dark">${escapeHtml(data.passenger ? data.passenger.phone : '')}</div>
                        </div>
                        <div class="col-6 col-md-3 text-end">
                            ${isConfirmed ? `
                                <button class="btn btn-outline-danger btn-sm" onclick="cancelReservation('${data.pnrNumber}')">Cancel Ticket</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    } catch (err) {
        resultBox.innerHTML = `
            <div class="alert alert-danger shadow-sm">
                <i class="fa-solid fa-circle-xmark me-2"></i> ${escapeHtml(err.message)}
            </div>`;
    }
}

/* ==========================================================================
   ADMIN DASHBOARD & TRAIN FLEET
   ========================================================================== */

async function loadAdminDashboard() {
    await Promise.allSettled([fetchPassengers(), loadAllReservations()]);

    const res = await fetch(`${API}/api/trains`);
    const trains = await res.json();

    document.getElementById("adminTotalTrains").textContent = trains.length;
    document.getElementById("adminTotalSeats").textContent = trains.reduce((a, t) => a + (t.totalSeats || 0), 0);
    document.getElementById("adminTotalPassengers").textContent = allPassengers.length;
    document.getElementById("adminTotalBookings").textContent = allReservations.filter(r => r.status === "CONFIRMED").length;

    const fleetBox = document.getElementById("adminFleetContainer");
    let html = `
        <table class="table table-hover align-middle mb-0">
            <thead>
                <tr>
                    <th>Train #</th>
                    <th>Train Name</th>
                    <th>Route</th>
                    <th>Dep / Arr</th>
                    <th>Seats (Avail / Total)</th>
                </tr>
            </thead>
            <tbody>`;
    trains.forEach(t => {
        html += `
            <tr>
                <td><span class="re-train-number-badge">#${t.trainNumber}</span></td>
                <td class="fw-bold">${escapeHtml(t.trainName)}</td>
                <td>${escapeHtml(t.source)} ➔ ${escapeHtml(t.destination)}</td>
                <td>${formatTimeAmPm(t.departureTime)} / ${formatTimeAmPm(t.arrivalTime)}</td>
                <td><strong>${t.availableSeats}</strong> / ${t.totalSeats}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    fleetBox.innerHTML = html;
}

function openAddTrainModal() {
    const modal = new bootstrap.Modal(document.getElementById("addTrainModal"));
    modal.show();
}

async function handleAddTrainSubmit(event) {
    event.preventDefault();

    const newTrain = {
        trainNumber: document.getElementById("newTrainNo").value.trim(),
        trainName: document.getElementById("newTrainName").value.trim(),
        source: document.getElementById("newTrainSrc").value.trim(),
        destination: document.getElementById("newTrainDst").value.trim(),
        totalSeats: parseInt(document.getElementById("newTrainTotal").value),
        availableSeats: parseInt(document.getElementById("newTrainAvail").value),
        departureTime: document.getElementById("newTrainDep").value + ":00",
        arrivalTime: document.getElementById("newTrainArr").value + ":00"
    };

    try {
        const res = await fetch(`${API}/api/trains`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTrain)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add train");

        bootstrap.Modal.getInstance(document.getElementById("addTrainModal")).hide();
        showToast(`Train ${data.trainName} added!`, "success");
        loadAdminDashboard();
        fetchAndSearchTrains(currentSearch.source, currentSearch.destination);
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function openTrainDetailsModal(trainId) {
    const train = allTrains.find(t => t.id === trainId);
    if (!train) return;
    alert(`Train Details:\n#${train.trainNumber} ${train.trainName}\nRoute: ${train.source} to ${train.destination}\nDeparture: ${train.departureTime} | Arrival: ${train.arrivalTime}\nAvailable Seats: ${train.availableSeats} of ${train.totalSeats}`);
}

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

function showToast(msg, type = "info") {
    const el = document.getElementById("reToast");
    const msgEl = document.getElementById("toastMessage");
    const iconEl = document.getElementById("toastIcon");

    msgEl.textContent = msg;

    const map = {
        success: { bg: "bg-dark", icon: "fa-circle-check text-success" },
        danger: { bg: "bg-danger", icon: "fa-circle-xmark" },
        warning: { bg: "bg-dark", icon: "fa-triangle-exclamation text-warning" },
        info: { bg: "bg-dark", icon: "fa-circle-info text-cyan" }
    };
    const c = map[type] || map.info;

    el.className = `toast align-items-center text-white border-0 shadow-lg ${c.bg}`;
    iconEl.innerHTML = `<i class="fa-solid ${c.icon}"></i>`;

    const toast = new bootstrap.Toast(el, { delay: 3500 });
    toast.show();
}

function formatTimeAmPm(timeStr) {
    if (!timeStr) return "--:--";
    try {
        const parts = timeStr.split(":");
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    } catch {
        return timeStr;
    }
}

function calculateDuration(dep, arr) {
    if (!dep || !arr) return "10h 00m";
    try {
        const [h1, m1] = dep.split(":").map(Number);
        const [h2, m2] = arr.split(":").map(Number);
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Next day
        const h = Math.floor(diffMinutes / 60);
        const m = diffMinutes % 60;
        return `${h}h ${String(m).padStart(2, '0')}m`;
    } catch {
        return "11h 35m";
    }
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return "Oct 15, 2026";
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
