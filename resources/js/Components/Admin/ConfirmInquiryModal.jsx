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
    bookingTimeSlots = DEFAULT_TIME_SLOTS,
    todayDate,
    onClose,
}) {
    const timeSlots = bookingTimeSlots.length > 0 ? bookingTimeSlots : DEFAULT_TIME_SLOTS;
    const initialTeam = inquiry.technicians?.length
        ? inquiry.technicians.map((technician) => String(technician.id))
        : inquiry.technician?.id
            ? [String(inquiry.technician.id)]
            : [];
    const initialLead = inquiry.technicians?.find((technician) => technician.is_lead)?.id
        ?? inquiry.technician?.id
        ?? initialTeam[0]
        ?? "";

    const [preferredDate, setPreferredDate] = useState(inquiry.preferred_date_value || todayDate || "");
    const [preferredTime, setPreferredTime] = useState(
        timeSlots.includes(inquiry.preferred_time) ? inquiry.preferred_time : timeSlots[0]
    );
    const [technicianIds, setTechnicianIds] = useState(initialTeam);
    const [leadTechnicianId, setLeadTechnicianId] = useState(String(initialLead || ""));
    const [allowAdditionalTechnicians, setAllowAdditionalTechnicians] = useState(
        Boolean(inquiry.accepting_technician_signups)
    );
    const [maxTechnicians, setMaxTechnicians] = useState(
        String(inquiry.max_technicians || Math.max(3, initialTeam.length || 1))
    );
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const toggleTechnician = (id) => {
        const key = String(id);
        setTechnicianIds((current) => {
            if (current.includes(key)) {
                const next = current.filter((value) => value !== key);
                if (leadTechnicianId === key) {
                    setLeadTechnicianId(next[0] || "");
                }
                return next;
            }

            if (current.length >= 8) {
                setErrors((existing) => ({
                    ...existing,
                    technician_ids: "A job can have up to 8 assigned technicians.",
                }));
                return current;
            }

            const next = [...current, key];
            if (!leadTechnicianId) setLeadTechnicianId(key);
            return next;
        });
        setErrors((existing) => ({ ...existing, technician_ids: undefined }));
    };

    const submit = (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});

        router.patch(
            "/admin/inquiries/" + inquiry.id + "/confirm",
            {
                preferred_date: preferredDate,
                preferred_time: preferredTime,
                technician_ids: technicianIds,
                lead_technician_id: leadTechnicianId,
                accepting_technician_signups: allowAdditionalTechnicians,
                max_technicians: Number(maxTechnicians),
            },
            {
                preserveScroll: true,
                onError: (validationErrors) => setErrors(validationErrors),
                onSuccess: () => onClose(),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const canSubmit =
        !processing &&
        technicians.length > 0 &&
        technicianIds.length > 0 &&
        technicianIds.includes(leadTechnicianId) &&
        Number(maxTechnicians) >= technicianIds.length &&
        Number(maxTechnicians) <= 8;

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{
                zIndex: 2000,
                backgroundColor: "rgba(15, 23, 42, 0.58)",
                overflowY: "auto",
            }}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onClose();
            }}
        >
            <div
                className="bg-white rounded-4 shadow-lg w-100"
                style={{ maxWidth: "650px", maxHeight: "92vh", overflowY: "auto" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-inquiry-title"
            >
                <div className="p-4 border-bottom d-flex align-items-start justify-content-between gap-3">
                    <div>
                        <div className="small text-primary fw-bold mb-1">
                            INQUIRY {inquiry.inquiry_number}
                        </div>
                        <h2 className="h4 fw-bold mb-1" id="confirm-inquiry-title">
                            Confirm &amp; Schedule Service
                        </h2>
                        <p className="text-muted small mb-0">
                            Set the appointment, assign a lead technician, and optionally let more technicians join.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        disabled={processing}
                        onClick={onClose}
                    />
                </div>

                <form onSubmit={submit}>
                    <div className="p-4">
                        <div className="rounded-3 bg-light p-3 mb-4">
                            <div className="small text-muted">CUSTOMER</div>
                            <div className="fw-semibold">{inquiry.customer_name}</div>
                            <div className="small text-muted">
                                {inquiry.service_type}
                                {inquiry.item_name ? " · " + inquiry.item_name : ""}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirm-preferred-date" className="form-label fw-semibold">
                                Service date
                            </label>
                            <input
                                id="confirm-preferred-date"
                                type="date"
                                className={"form-control" + (errors.preferred_date ? " is-invalid" : "")}
                                value={preferredDate}
                                min={todayDate || undefined}
                                required
                                onChange={(event) => setPreferredDate(event.target.value)}
                            />
                            {errors.preferred_date && (
                                <div className="invalid-feedback">{errors.preferred_date}</div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirm-preferred-time" className="form-label fw-semibold">
                                Service time slot
                            </label>
                            <select
                                id="confirm-preferred-time"
                                className={"form-select" + (errors.preferred_time ? " is-invalid" : "")}
                                value={preferredTime}
                                required
                                onChange={(event) => setPreferredTime(event.target.value)}
                            >
                                {timeSlots.map((slot) => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))}
                            </select>
                            {errors.preferred_time && (
                                <div className="invalid-feedback">{errors.preferred_time}</div>
                            )}
                        </div>

                        <div className="mb-3">
                            <div className="form-label fw-semibold mb-2">
                                Assign technicians <span className="text-danger">*</span>
                            </div>
                            <div className="border rounded-3 p-2" style={{ maxHeight: "230px", overflowY: "auto" }}>
                                {technicians.map((technician) => {
                                    const id = String(technician.id);
                                    const selected = technicianIds.includes(id);
                                    return (
                                        <label
                                            key={technician.id}
                                            className="d-flex align-items-center gap-3 rounded-2 p-2"
                                            style={{ cursor: "pointer", background: selected ? "#eff6ff" : "transparent" }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="form-check-input mt-0"
                                                checked={selected}
                                                onChange={() => toggleTechnician(technician.id)}
                                                disabled={processing}
                                            />
                                            <span className="flex-grow-1">
                                                <span className="d-block fw-semibold">{technician.name}</span>
                                                <span className="d-block small text-muted">{technician.email}</span>
                                            </span>
                                            {String(leadTechnicianId) === id && (
                                                <span className="badge text-bg-primary">Lead</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                            {technicians.length === 0 && (
                                <div className="form-text text-danger">
                                    No technicians are available. Add a technician account before confirming this inquiry.
                                </div>
                            )}
                            {errors.technician_ids && (
                                <div className="small text-danger mt-1">{errors.technician_ids}</div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="lead-technician" className="form-label fw-semibold">
                                Lead technician
                            </label>
                            <select
                                id="lead-technician"
                                className={"form-select" + (errors.lead_technician_id ? " is-invalid" : "")}
                                value={leadTechnicianId}
                                onChange={(event) => setLeadTechnicianId(event.target.value)}
                                required
                            >
                                <option value="">Choose the lead technician</option>
                                {technicians
                                    .filter((technician) => technicianIds.includes(String(technician.id)))
                                    .map((technician) => (
                                        <option key={technician.id} value={String(technician.id)}>
                                            {technician.name}
                                        </option>
                                    ))}
                            </select>
                            {errors.lead_technician_id && (
                                <div className="invalid-feedback">{errors.lead_technician_id}</div>
                            )}
                        </div>

                        <div className="form-check mb-3">
                            <input
                                id="allow-technician-signups"
                                type="checkbox"
                                className="form-check-input"
                                checked={allowAdditionalTechnicians}
                                onChange={(event) => setAllowAdditionalTechnicians(event.target.checked)}
                            />
                            <label htmlFor="allow-technician-signups" className="form-check-label fw-semibold">
                                Allow other technicians to join this job
                            </label>
                            <div className="form-text">
                                If enabled, eligible technicians can volunteer from their staff workspace. They cannot see customer contact details until assigned.
                            </div>
                        </div>

                        <div className="mb-1">
                            <label htmlFor="max-technicians" className="form-label fw-semibold">
                                Maximum team size
                            </label>
                            <select
                                id="max-technicians"
                                className={"form-select" + (errors.max_technicians ? " is-invalid" : "")}
                                value={maxTechnicians}
                                onChange={(event) => setMaxTechnicians(event.target.value)}
                                required
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                                    <option key={count} value={String(count)}>{count} technician{count === 1 ? "" : "s"}</option>
                                ))}
                            </select>
                            {errors.max_technicians && (
                                <div className="invalid-feedback">{errors.max_technicians}</div>
                            )}
                        </div>

                        {errors.availability && (
                            <div className="alert alert-danger mt-3 mb-0" role="alert">
                                {errors.availability}
                            </div>
                        )}
                    </div>

                    <div className="border-top p-3 p-sm-4 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary fw-semibold"
                            disabled={processing}
                            onClick={onClose}
                        >
                            CANCEL
                        </button>
                        <button type="submit" className="btn btn-primary fw-bold" disabled={!canSubmit}>
                            {processing ? "CONFIRMING..." : "CONFIRM & ASSIGN TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
