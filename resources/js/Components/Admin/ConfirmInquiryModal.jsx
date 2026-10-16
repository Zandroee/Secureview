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
    const timeSlots = bookingTimeSlots.length > 0
        ? bookingTimeSlots
        : DEFAULT_TIME_SLOTS;
    const initialTime = timeSlots.includes(inquiry.preferred_time)
        ? inquiry.preferred_time
        : timeSlots[0];

    const [preferredDate, setPreferredDate] = useState(
        inquiry.preferred_date_value || todayDate || ""
    );
    const [preferredTime, setPreferredTime] = useState(initialTime);
    const [technicianIds, setTechnicianIds] = useState(() => {
        const existing = (inquiry.technicians ?? []).map((technician) => String(technician.id));
        if (existing.length) return existing;
        return inquiry.technician?.id ? [String(inquiry.technician.id)] : [];
    });
    const [leadTechnicianId, setLeadTechnicianId] = useState(() => {
        const lead = (inquiry.technicians ?? []).find((technician) => technician.is_lead);
        return String(lead?.id ?? inquiry.technician?.id ?? "");
    });
    const [allowAdditionalTechnicians, setAllowAdditionalTechnicians] = useState(
        Boolean(inquiry.allow_additional_technicians)
    );
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

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
                allow_additional_technicians: allowAdditionalTechnicians,
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
            style={{
                zIndex: 2000,
                backgroundColor: "rgba(15, 23, 42, 0.58)",
                overflowY: "auto",
            }}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) {
                    onClose();
                }
            }}
        >
            <div
                className="bg-white rounded-4 shadow-lg w-100"
                style={{ maxWidth: "600px", maxHeight: "92vh", overflowY: "auto" }}
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
                            Choose the final appointment slot and the technician who will handle this job.
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

                        <div className="mb-3">
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
                            <label htmlFor="confirm-technicians" className="form-label fw-semibold">
                                Assign technician team <span className="text-danger">*</span>
                            </label>
                            <select
                                id="confirm-technicians"
                                multiple
                                size={Math.min(Math.max(technicians.length, 3), 6)}
                                className={"form-select" + (errors.technician_ids ? " is-invalid" : "")}
                                value={technicianIds}
                                required
                                onChange={(event) => {
                                    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
                                    setTechnicianIds(selected);
                                    if (!selected.includes(leadTechnicianId)) {
                                        setLeadTechnicianId(selected[0] ?? "");
                                    }
                                }}
                            >
                                {technicians.map((technician) => (
                                    <option key={technician.id} value={String(technician.id)}>
                                        {technician.name}{technician.email ? " — " + technician.email : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="form-text">Select one or more technicians. Use Ctrl (Windows) or Command (Mac) to select multiple names.</div>
                            {errors.technician_ids && (
                                <div className="small text-danger mt-1">{errors.technician_ids}</div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirm-lead-technician" className="form-label fw-semibold">
                                Lead technician <span className="text-danger">*</span>
                            </label>
                            <select
                                id="confirm-lead-technician"
                                className={"form-select" + (errors.lead_technician_id ? " is-invalid" : "")}
                                value={leadTechnicianId}
                                required
                                onChange={(event) => setLeadTechnicianId(event.target.value)}
                            >
                                <option value="">Choose lead technician</option>
                                {technicians.filter((technician) => technicianIds.includes(String(technician.id))).map((technician) => (
                                    <option key={technician.id} value={String(technician.id)}>{technician.name}</option>
                                ))}
                            </select>
                            {errors.lead_technician_id && (
                                <div className="invalid-feedback">{errors.lead_technician_id}</div>
                            )}
                            {technicians.length === 0 && (
                                <div className="form-text text-danger">
                                    No technicians are available. Add a technician account before confirming this inquiry.
                                </div>
                            )}
                        </div>

                        <div className="form-check mb-1">
                            <input
                                id="allow-additional-technicians"
                                type="checkbox"
                                className="form-check-input"
                                checked={allowAdditionalTechnicians}
                                onChange={(event) => setAllowAdditionalTechnicians(event.target.checked)}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="allow-additional-technicians">
                                Allow other eligible technicians to join this job
                            </label>
                            <div className="form-text">When enabled, technicians can volunteer to join this scheduled service if they have no conflicting job.</div>
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
                        <button
                            type="submit"
                            className="btn btn-primary fw-bold"
                            disabled={processing || technicians.length === 0 || technicianIds.length === 0 || !technicianIds.includes(leadTechnicianId)}
                        >
                            {processing ? "CONFIRMING..." : "CONFIRM & ASSIGN TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
