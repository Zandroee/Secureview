import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { Link, router } from "@inertiajs/react";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { useState } from "react";
import { googleMapsSearchUrl } from "../../Components/GoogleMaps/ServiceLocation";

function urgencyClass(urgency) {
    if (urgency === "emergency") {
        return "bg-danger-subtle text-danger";
    }

    if (urgency === "urgent") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-success-subtle text-success";
}

function statusClass(status) {
    if (status === "in_progress") {
        return "bg-primary-subtle text-primary";
    }

    return "bg-info-subtle text-info-emphasis";
}

function statusLabel(status) {
    return status === "in_progress" ? "In Progress" : "Confirmed";
}


function ScheduleActions({ schedule, todayDate, bookingTimeSlots }) {
    const [editing, setEditing] = useState(false);
    const [date, setDate] = useState(schedule.preferred_date_value || todayDate);
    const [time, setTime] = useState(schedule.preferred_time || bookingTimeSlots[0] || "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const saveSchedule = (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        router.patch("/admin/schedules/" + schedule.id, { preferred_date: date, preferred_time: time }, {
            preserveScroll: true,
            onError: (errors) => setError(errors.preferred_date || errors.preferred_time || errors.schedule || "Unable to update schedule."),
            onSuccess: () => setEditing(false),
            onFinish: () => setBusy(false),
        });
    };

    const reviewRequest = (action) => {
        if (busy) return;
        setBusy(true);
        setError("");
        router.patch("/admin/reschedule-requests/" + schedule.id + "/" + action, {}, {
            preserveScroll: true,
            onError: (errors) => setError(errors.reschedule || errors.preferred_time || errors.preferred_date || "Unable to review request."),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="d-flex flex-column align-items-end gap-2">
            {schedule.reschedule_request_status === "pending" && (
                <div className="rounded-3 border bg-warning-subtle p-2 text-start" style={{ minWidth: 220 }}>
                    <div className="small fw-bold">Customer reschedule request</div>
                    <div className="small">{schedule.reschedule_requested_date} · {schedule.reschedule_requested_time}</div>
                    {schedule.reschedule_request_note && <div className="small text-muted mt-1">{schedule.reschedule_request_note}</div>}
                    <div className="d-flex gap-1 mt-2">
                        <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => reviewRequest("approve")}>Approve</button>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => reviewRequest("decline")}>Decline</button>
                    </div>
                </div>
            )}
            {error && <div className="small text-danger" role="alert">{error}</div>}
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel edit" : "Change schedule"}</button>
            {editing && (
                <form onSubmit={saveSchedule} className="border rounded-3 bg-light p-2 text-start" style={{ minWidth: 220 }}>
                    <label className="form-label small fw-semibold">Date</label>
                    <input type="date" className="form-control form-control-sm mb-2" min={todayDate || undefined} value={date} required onChange={(event) => setDate(event.target.value)} />
                    <label className="form-label small fw-semibold">Time slot</label>
                    <select className="form-select form-select-sm mb-2" value={time} required onChange={(event) => setTime(event.target.value)}>
                        {bookingTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm w-100" disabled={busy}>{busy ? "Saving..." : "Save schedule"}</button>
                </form>
            )}
        </div>
    );
}

export default function AdminSchedules({
    schedules = [],
    technicians = [],
    summary = {},
    filters = {},
    blockedBookingDates = [],
    blockedBookingTimeSlots = [],
    bookingTimeSlots = [],
    todayDate = "",
}) {
    const scheduleRows = schedules.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [technician, setTechnician] = useState(filters.technician ?? "");
    const [bookingDate, setBookingDate] = useState("");
    const [bookingType, setBookingType] = useState("full_date");
    const [bookingTime, setBookingTime] = useState("");
    const [bookingReason, setBookingReason] = useState("");
    const [availabilityMessage, setAvailabilityMessage] = useState("");
    const [availabilityError, setAvailabilityError] = useState("");

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/schedules",
            {
                search,
                status,
                technician,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setTechnician("");

        router.get(
            "/admin/schedules",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const markDateFullyBooked = (event) => {
        event.preventDefault();
        setAvailabilityMessage("");
        setAvailabilityError("");

        router.post(
            "/admin/booking-availability",
            {
                booking_date: bookingDate,
                block_type: bookingType,
                booking_time: bookingType === "time_slot" ? bookingTime : "",
                reason: bookingReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBookingDate("");
                    setBookingTime("");
                    setBookingReason("");
                    setAvailabilityMessage(
                        bookingType === "time_slot"
                            ? "The selected time slot is now fully booked."
                            : "The selected date is now fully booked."
                    );
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    setAvailabilityError(
                        Array.isArray(firstError)
                            ? firstError[0]
                            : firstError || "Could not update booking availability."
                    );
                },
            }
        );
    };

    const reopenBookingTimeSlot = (blockedSlot) => {
        const confirmed = window.confirm(
            "Make " +
                blockedSlot.formatted_date +
                " (" +
                blockedSlot.booking_time +
                ") available for booking again?"
        );

        if (!confirmed) {
            return;
        }

        setAvailabilityMessage("");
        setAvailabilityError("");

        router.delete(
            "/admin/booking-time-slots/" + blockedSlot.id,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAvailabilityMessage(
                        blockedSlot.formatted_date +
                            " · " +
                            blockedSlot.booking_time +
                            " is available again."
                    );
                },
                onError: () => {
                    setAvailabilityError(
                        "Could not reopen this time slot. Please try again."
                    );
                },
            }
        );
    };

    const reopenBookingDate = (blockedDate) => {
        const confirmed = window.confirm(
            "Make " + blockedDate.formatted_date + " available for booking again?"
        );

        if (!confirmed) {
            return;
        }

        setAvailabilityMessage("");
        setAvailabilityError("");

        router.delete(
            "/admin/booking-availability/" + blockedDate.id,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAvailabilityMessage(
                        blockedDate.formatted_date + " is available again."
                    );
                },
                onError: () => {
                    setAvailabilityError("Could not reopen this date. Please try again.");
                },
            }
        );
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="schedules" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">
                                SECUREVIEW ADMIN
                            </div>

                            <h1 className="fw-bold mb-1">
                                SERVICE SCHEDULES
                            </h1>

                            <div className="small text-muted">
                                Monitor confirmed and in-progress service jobs.
                            </div>
                        </div>

                        <section
                            className="bg-white border rounded-3 p-3 mb-3"
                            aria-labelledby="booking-availability-title"
                            style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.05)" }}
                        >
                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                <div>
                                    <h2 id="booking-availability-title" className="h5 fw-bold mb-1">
                                        BOOKING DATE AVAILABILITY
                                    </h2>
                                    <p className="small text-muted mb-0">
                                        Block an entire date or one of its three-hour time slots. Customers cannot select blocked options until you reopen them.
                                    </p>
                                </div>
                                <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                                    {blockedBookingDates.length} blocked date{blockedBookingDates.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            {availabilityMessage && (
                                <div className="alert alert-success py-2 small" role="status">
                                    {availabilityMessage}
                                </div>
                            )}
                            {availabilityError && (
                                <div className="alert alert-danger py-2 small" role="alert">
                                    {availabilityError}
                                </div>
                            )}

                            <div className="row g-3">
                                <div className="col-lg-5">
                                    <form onSubmit={markDateFullyBooked} className="border rounded-3 p-3 h-100">
                                        <h3 className="h6 fw-bold mb-3">Mark availability as full</h3>
                                        <div className="mb-2">
                                            <label htmlFor="booking-block-type" className="form-label small fw-semibold">
                                                WHAT SHOULD BE BLOCKED?
                                            </label>
                                            <select
                                                id="booking-block-type"
                                                className="form-select"
                                                value={bookingType}
                                                onChange={(event) => {
                                                    setBookingType(event.target.value);
                                                    setBookingTime("");
                                                }}
                                            >
                                                <option value="full_date">Entire date</option>
                                                <option value="time_slot">Specific 3-hour time slot</option>
                                            </select>
                                        </div>
                                        <div className="mb-2">
                                            <label htmlFor="booking-block-date" className="form-label small fw-semibold">
                                                DATE
                                            </label>
                                            <input
                                                id="booking-block-date"
                                                type="date"
                                                className="form-control"
                                                value={bookingDate}
                                                min={todayDate}
                                                required
                                                onChange={(event) => setBookingDate(event.target.value)}
                                            />
                                        </div>
                                        {bookingType === "time_slot" && (
                                            <div className="mb-2">
                                                <label htmlFor="booking-block-time" className="form-label small fw-semibold">
                                                    3-HOUR TIME SLOT
                                                </label>
                                                <select
                                                    id="booking-block-time"
                                                    className="form-select"
                                                    value={bookingTime}
                                                    required
                                                    onChange={(event) => setBookingTime(event.target.value)}
                                                >
                                                    <option value="">Choose a time slot</option>
                                                    {bookingTimeSlots.map((slot) => (
                                                        <option key={slot} value={slot}>
                                                            {slot}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="mb-3">
                                            <label htmlFor="booking-block-reason" className="form-label small fw-semibold">
                                                REASON (OPTIONAL)
                                            </label>
                                            <input
                                                id="booking-block-reason"
                                                type="text"
                                                className="form-control"
                                                maxLength={255}
                                                placeholder="e.g. No technicians available"
                                                value={bookingReason}
                                                onChange={(event) => setBookingReason(event.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-danger fw-bold w-100"
                                            disabled={
                                                !bookingDate ||
                                                (bookingType === "time_slot" && !bookingTime)
                                            }
                                        >
                                            <i className="bi bi-calendar-x me-2" />
                                            {bookingType === "time_slot"
                                                ? "MARK TIME FULLY BOOKED"
                                                : "MARK DATE FULLY BOOKED"}
                                        </button>
                                    </form>
                                </div>

                                <div className="col-lg-7">
                                    <div className="border rounded-3 p-3 h-100">
                                        <h3 className="h6 fw-bold mb-3">Fully booked dates</h3>
                                        {blockedBookingDates.length === 0 ? (
                                            <div className="bg-light rounded-3 p-4 text-center">
                                                <i className="bi bi-calendar-check text-success fs-4" />
                                                <p className="small text-muted mt-2 mb-0">
                                                    No upcoming dates are blocked. All dates are available for booking.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-2" style={{ maxHeight: "285px", overflowY: "auto" }}>
                                                {blockedBookingDates.map((blockedDate) => (
                                                    <div
                                                        key={blockedDate.id}
                                                        className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded-3 px-3 py-2"
                                                    >
                                                        <div className="d-flex align-items-start gap-2">
                                                            <i className="bi bi-calendar-x text-danger mt-1" />
                                                            <div>
                                                                <div className="fw-semibold small">
                                                                    {blockedDate.formatted_date}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {blockedDate.reason || "Marked fully booked by admin"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm fw-bold"
                                                            onClick={() => reopenBookingDate(blockedDate)}
                                                        >
                                                            <i className="bi bi-calendar-check me-1" />
                                                            REOPEN
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <hr className="my-3" />
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                            <h3 className="h6 fw-bold mb-0">
                                                Fully booked time slots
                                            </h3>
                                            <span className="small text-muted">
                                                {blockedBookingTimeSlots.length} blocked
                                            </span>
                                        </div>

                                        {blockedBookingTimeSlots.length === 0 ? (
                                            <div className="small text-muted bg-light rounded-3 p-3">
                                                No individual time slots are blocked.
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-2" style={{ maxHeight: "285px", overflowY: "auto" }}>
                                                {blockedBookingTimeSlots.map((blockedSlot) => (
                                                    <div
                                                        key={blockedSlot.id}
                                                        className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded-3 px-3 py-2"
                                                    >
                                                        <div className="d-flex align-items-start gap-2">
                                                            <i className="bi bi-clock text-danger mt-1" />
                                                            <div>
                                                                <div className="fw-semibold small">
                                                                    {blockedSlot.formatted_date}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {blockedSlot.booking_time}
                                                                </div>
                                                                {blockedSlot.reason && (
                                                                    <div className="small text-muted">
                                                                        {blockedSlot.reason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm fw-bold"
                                                            onClick={() => reopenBookingTimeSlot(blockedSlot)}
                                                        >
                                                            <i className="bi bi-clock me-1" />
                                                            REOPEN
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        ACTIVE SCHEDULES
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.active ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        CONFIRMED
                                    </div>

                                    <div className="h4 fw-bold text-info-emphasis mb-0">
                                        {summary.confirmed ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        IN PROGRESS
                                    </div>

                                    <div className="h4 fw-bold text-primary mb-0">
                                        {summary.in_progress ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        UNASSIGNED
                                    </div>

                                    <div className="h4 fw-bold text-warning-emphasis mb-0">
                                        {summary.unassigned ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-white border rounded-3 p-3 mb-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <form
                                className="row g-2 align-items-end"
                                onSubmit={applyFilters}
                            >
                                <div className="col-lg-5">
                                    <label className="form-label small fw-semibold mb-1">
                                        SEARCH
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Inquiry, customer, or service"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        STATUS
                                    </label>

                                    <select
                                        className="form-select"
                                        value={status}
                                        onChange={(event) =>
                                            setStatus(event.target.value)
                                        }
                                    >
                                        <option value="">All statuses</option>
                                        <option value="confirmed">
                                            Confirmed
                                        </option>
                                        <option value="in_progress">
                                            In Progress
                                        </option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small fw-semibold mb-1">
                                        TECHNICIAN
                                    </label>

                                    <select
                                        className="form-select"
                                        value={technician}
                                        onChange={(event) =>
                                            setTechnician(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            All technicians
                                        </option>

                                        {technicians.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-sm-6 col-lg-1 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary fw-bold"
                                        onClick={clearFilters}
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div
                            className="bg-white border rounded-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">PRIORITY</th>
                                            <th>SCHEDULE</th>
                                            <th>CUSTOMER</th>
                                            <th>SERVICE</th>
                                            <th>TECHNICIAN</th>
                                            <th>STATUS</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {scheduleRows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No active schedules found.
                                                </td>
                                            </tr>
                                        ) : (
                                            scheduleRows.map((schedule) => (
                                                <tr key={schedule.id}>
                                                    <td className="ps-3">
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                urgencyClass(
                                                                    schedule.urgency
                                                                )
                                                            }
                                                        >
                                                            {schedule.urgency}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                schedule.preferred_time
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.customer_name
                                                            }
                                                        </div>

                                                        <div className="small text-muted text-truncate" title={schedule.street_address}>
                                                            {schedule.street_address || schedule.city || "Location not provided"}
                                                        </div>
                                                        {schedule.address_details && (
                                                            <div className="small text-muted text-truncate" title={schedule.address_details}>
                                                                {schedule.address_details}
                                                            </div>
                                                        )}
                                                        {(schedule.google_place_id || schedule.service_latitude !== null && schedule.service_latitude !== undefined || schedule.street_address || schedule.city) && (
                                                            <a
                                                                href={googleMapsSearchUrl({
                                                                    latitude: schedule.service_latitude,
                                                                    longitude: schedule.service_longitude,
                                                                    placeId: schedule.google_place_id,
                                                                    streetAddress: schedule.street_address,
                                                                    city: schedule.city,
                                                                    addressDetails: schedule.address_details,
                                                                })}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="small text-decoration-none"
                                                            >
                                                                <i className="bi bi-map me-1" />View map
                                                            </a>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {schedule.item_name ||
                                                                "General Service"}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {(schedule.technicians ?? []).length ? (
                                                            <div className="d-flex flex-column gap-1">
                                                                {schedule.technicians.map((technician) => (
                                                                    <div key={technician.id} className="small">
                                                                        <span className="fw-semibold">{technician.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-warning-emphasis small fw-semibold">Unassigned</span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                statusClass(
                                                                    schedule.status
                                                                )
                                                            }
                                                        >
                                                            {statusLabel(
                                                                schedule.status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <div className="d-flex flex-column align-items-end gap-2">
                                                            <ScheduleActions schedule={schedule} todayDate={todayDate} bookingTimeSlots={bookingTimeSlots} />
                                                            <Link href={"/admin/inquiries/" + schedule.id} className="btn btn-outline-primary btn-sm fw-bold">VIEW</Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={schedules} label="schedules" insideCard />
                        </div>


                        <div className="small text-muted mt-3">
                            Use the inquiry details page to change the
                            technician assignment or job status.
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}
