import { router } from "@inertiajs/react";
import { useState } from "react";

const DEFAULT_TIME_SLOTS = [
    "08:00 AM - 11:00 AM",
    "11:00 AM - 02:00 PM",
    "02:00 PM - 05:00 PM",
];

export default function ConfirmInquiryModal({
    inquiry,
    technicians = [],
    technicianBookings = [],
    blockedBookingDates = [],
    blockedBookingTimeSlots = [],
    bookingTimeSlots = DEFAULT_TIME_SLOTS,
    todayDate,
    onClose,
}) {
    const timeSlots = bookingTimeSlots.length > 0 ? bookingTimeSlots : DEFAULT_TIME_SLOTS;
    const requestedDate = inquiry.preferred_date_value || todayDate || "";
    const requestedTime = timeSlots.includes(inquiry.preferred_time) ? inquiry.preferred_time : timeSlots[0];

    const isDateBlocked = (date) => blockedBookingDates.map(String).includes(String(date));
    const isTimeSlotBlocked = (date, time) => blockedBookingTimeSlots.some(
        (slot) => String(slot.date) === String(date) && slot.time === time
    );
    const isTechnicianBusy = (technicianId, date) => technicianBookings.some((booking) =>
        Number(booking.inquiry_id) !== Number(inquiry.id)
        && String(booking.date) === String(date)
        && (booking.technician_ids ?? []).map(String).includes(String(technicianId))
    );

    const [preferredDate, setPreferredDate] = useState(requestedDate);
    const [preferredTime, setPreferredTime] = useState(() => {
        if (!isTimeSlotBlocked(requestedDate, requestedTime)) return requestedTime;
        return timeSlots.find((slot) => !isTimeSlotBlocked(requestedDate, slot)) ?? requestedTime;
    });
    const [technicianIds, setTechnicianIds] = useState(() => {
        const existing = (inquiry.technicians ?? []).map((technician) => String(technician.id));
        if (existing.length) return existing;
        return inquiry.technician?.id ? [String(inquiry.technician.id)] : [];
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const dateBlocked = isDateBlocked(preferredDate);
    const timeSlotBlocked = isTimeSlotBlocked(preferredDate, preferredTime);
    const availableTechnicians = technicians.filter(
        (technician) => !isTechnicianBusy(technician.id, preferredDate)
    );
    const selectedBusyIds = technicianIds.filter((id) => isTechnicianBusy(id, preferredDate));
    const availableTimeSlots = timeSlots.filter((slot) => !isTimeSlotBlocked(preferredDate, slot));

    const clearAvailabilityErrors = () => {
        setErrors((current) => {
            const next = { ...current };
            delete next.preferred_date;
            delete next.preferred_time;
            delete next.technician_ids;
            delete next.availability;
            return next;
        });
    };

    const toggleTechnician = (technicianId) => {
        const id = String(technicianId);
        if (isTechnicianBusy(id, preferredDate)) return;

        setTechnicianIds((current) => {
            if (current.includes(id)) return current.filter((value) => value !== id);
            if (current.length >= 10) {
                setErrors((previous) => ({
                    ...previous,
                    technician_ids: "A service can have up to 10 technicians.",
                }));
                return current;
            }
            return [...current, id];
        });
        setErrors((current) => {
            const next = { ...current };
            delete next.technician_ids;
            return next;
        });
    };

    const changeDate = (nextDate) => {
        setPreferredDate(nextDate);
        setTechnicianIds((current) => current.filter((id) => !isTechnicianBusy(id, nextDate)));

        if (isTimeSlotBlocked(nextDate, preferredTime)) {
            const firstAvailable = timeSlots.find((slot) => !isTimeSlotBlocked(nextDate, slot));
            if (firstAvailable) setPreferredTime(firstAvailable);
        }
        clearAvailabilityErrors();
    };

    const submit = (event) => {
        event.preventDefault();

        const nextErrors = {};
        if (!preferredDate) nextErrors.preferred_date = "Choose a service date.";
        if (dateBlocked) nextErrors.preferred_date = "This date is fully booked or blocked. Choose another date.";
        if (timeSlotBlocked) nextErrors.preferred_time = "This time slot is blocked for the selected date. Choose another slot.";
        if (technicianIds.length === 0) nextErrors.technician_ids = "Select at least one available technician.";
        if (selectedBusyIds.length > 0) nextErrors.technician_ids = "Remove technicians who are already assigned on this date.";
        if (technicianIds.length > 10) nextErrors.technician_ids = "A service can have up to 10 technicians.";

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setErrors({});

        router.patch(
            "/admin/inquiries/" + inquiry.id + "/confirm",
            {
                preferred_date: preferredDate,
                preferred_time: preferredTime,
                technician_ids: technicianIds,
            },
            {
                preserveScroll: true,
                onError: (validationErrors) => setErrors(validationErrors),
                onSuccess: () => onClose(),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ zIndex: 2000, backgroundColor: "rgba(15, 23, 42, 0.58)", overflowY: "auto" }}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onClose();
            }}
        >
            <div
                className="bg-white rounded-4 shadow-lg w-100"
                style={{ maxWidth: "680px", maxHeight: "92vh", overflowY: "auto" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-inquiry-title"
            >
                <div className="p-4 border-bottom d-flex align-items-start justify-content-between gap-3">
                    <div>
                        <div className="small text-primary fw-bold mb-1">SERVICE REQUEST {inquiry.inquiry_number}</div>
                        <h2 className="h4 fw-bold mb-1" id="confirm-inquiry-title">Confirm &amp; Schedule Service</h2>
                        <p className="text-muted small mb-0">Choose a date and time that are available, then select only technicians who are free that day.</p>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" disabled={processing} onClick={onClose} />
                </div>

                <form onSubmit={submit}>
                    <div className="p-4">
                        <div className="rounded-3 bg-light p-3 mb-4">
                            <div className="small text-muted">CUSTOMER</div>
                            <div className="fw-semibold">{inquiry.customer_name}</div>
                            <div className="small text-muted">
                                {inquiry.service_type}{inquiry.item_name ? " · " + inquiry.item_name : ""}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirm-preferred-date" className="form-label fw-semibold">Service date</label>
                            <input
                                id="confirm-preferred-date"
                                type="date"
                                className={"form-control" + (errors.preferred_date || dateBlocked ? " is-invalid" : "")}
                                value={preferredDate}
                                min={todayDate || undefined}
                                required
                                disabled={processing}
                                onChange={(event) => changeDate(event.target.value)}
                            />
                            {errors.preferred_date && <div className="invalid-feedback">{errors.preferred_date}</div>}
                            {!errors.preferred_date && dateBlocked && <div className="small text-danger mt-1">This date is blocked or all technicians are already scheduled. Choose a different date.</div>}
                            {!dateBlocked && preferredDate && <div className="form-text">Dates with no remaining technician capacity are rejected by the system.</div>}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirm-preferred-time" className="form-label fw-semibold">Service time slot</label>
                            <select
                                id="confirm-preferred-time"
                                className={"form-select" + (errors.preferred_time || timeSlotBlocked ? " is-invalid" : "")}
                                value={preferredTime}
                                required
                                disabled={processing}
                                onChange={(event) => {
                                    setPreferredTime(event.target.value);
                                    setErrors((current) => {
                                        const next = { ...current };
                                        delete next.preferred_time;
                                        delete next.availability;
                                        return next;
                                    });
                                }}
                            >
                                {timeSlots.map((slot) => {
                                    const blocked = isTimeSlotBlocked(preferredDate, slot);
                                    return <option key={slot} value={slot} disabled={blocked}>{slot}{blocked ? " — BLOCKED" : ""}</option>;
                                })}
                            </select>
                            {errors.preferred_time && <div className="invalid-feedback">{errors.preferred_time}</div>}
                            {!errors.preferred_time && timeSlotBlocked && <div className="small text-danger mt-1">This slot is blocked for the chosen date.</div>}
                            <div className="form-text">
                                {availableTimeSlots.length} of {timeSlots.length} time slots available on the selected date.
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-2">
                                <label className="form-label fw-semibold mb-0" id="confirm-technicians-label">
                                    Assign technician team <span className="text-danger">*</span>
                                </label>
                                <span className="badge rounded-pill bg-primary-subtle text-primary">
                                    {technicianIds.length}/10 selected
                                </span>
                            </div>
                            <p className="small text-muted mb-3">
                                Technicians already assigned to another service on this date are unavailable. Select each available technician by checking their card.
                            </p>

                            <div className="d-flex flex-column gap-2" role="group" aria-labelledby="confirm-technicians-label">
                                {technicians.map((technician) => {
                                    const id = String(technician.id);
                                    const busy = isTechnicianBusy(id, preferredDate);
                                    const checked = technicianIds.includes(id);
                                    return (
                                        <label
                                            key={id}
                                            className={"d-flex align-items-center gap-3 border rounded-3 p-3 " + (busy ? "bg-light text-muted" : checked ? "border-primary bg-primary-subtle" : "bg-white")}
                                            style={{ cursor: busy || processing ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="form-check-input flex-shrink-0 m-0"
                                                checked={checked}
                                                disabled={busy || processing}
                                                onChange={() => toggleTechnician(id)}
                                            />
                                            <span className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary flex-shrink-0" style={{ width: 40, height: 40 }}>
                                                <i className="bi bi-person-workspace" />
                                            </span>
                                            <span className="flex-grow-1 min-w-0">
                                                <span className="d-block fw-semibold text-dark">{technician.name}</span>
                                                {technician.email && <span className="d-block small text-muted text-break">{technician.email}</span>}
                                            </span>
                                            <span className={"badge rounded-pill flex-shrink-0 " + (busy ? "bg-secondary text-white" : checked ? "bg-primary text-white" : "bg-success-subtle text-success")}>
                                                {busy ? "Busy on this date" : checked ? "Selected" : "Available"}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            {errors.technician_ids && <div className="small text-danger mt-2" role="alert">{errors.technician_ids}</div>}
                            {technicians.length === 0 && <div className="alert alert-warning mt-3 mb-0">No technician accounts are available. Add a technician before confirming this request.</div>}
                            {technicians.length > 0 && availableTechnicians.length === 0 && !dateBlocked && (
                                <div className="alert alert-warning mt-3 mb-0">All technicians are already assigned on this date. Choose a different date.</div>
                            )}
                        </div>

                        {errors.availability && <div className="alert alert-danger mt-3 mb-0" role="alert">{errors.availability}</div>}
                    </div>

                    <div className="border-top p-3 p-sm-4 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary fw-semibold" disabled={processing} onClick={onClose}>CANCEL</button>
                        <button
                            type="submit"
                            className="btn btn-primary fw-bold"
                            disabled={processing || technicians.length === 0 || technicianIds.length === 0 || dateBlocked || timeSlotBlocked || selectedBusyIds.length > 0 || availableTechnicians.length === 0}
                        >
                            {processing ? "CONFIRMING..." : "CONFIRM & ASSIGN TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
