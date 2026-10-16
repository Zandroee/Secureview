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
    const initialTime = timeSlots.includes(inquiry.preferred_time) ? inquiry.preferred_time : timeSlots[0];
    const initialIds = (inquiry.technicians ?? []).map((tech) => String(tech.id));
    if (initialIds.length === 0 && inquiry.technician?.id) initialIds.push(String(inquiry.technician.id));

    const [preferredDate, setPreferredDate] = useState(inquiry.preferred_date_value || todayDate || "");
    const [preferredTime, setPreferredTime] = useState(initialTime);
    const [selectedIds, setSelectedIds] = useState(initialIds);
    const [leadId, setLeadId] = useState(String(
        inquiry.technicians?.find((tech) => tech.is_lead)?.id ?? inquiry.technician?.id ?? initialIds[0] ?? ""
    ));
    const [allowSelfAssignment, setAllowSelfAssignment] = useState(Boolean(inquiry.allow_technician_self_assignment));
    const [maxTechnicians, setMaxTechnicians] = useState(String(Math.max(Number(inquiry.max_technicians ?? 3), initialIds.length, 1)));
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const toggleTechnician = (id, checked) => {
        const next = checked
            ? Array.from(new Set([...selectedIds, String(id)]))
            : selectedIds.filter((selected) => selected !== String(id));

        setSelectedIds(next);
        setMaxTechnicians((current) => String(Math.max(Number(current) || 1, next.length, 1)));
        if (!next.includes(leadId)) setLeadId(next[0] ?? "");
        if (next.length === 0) setLeadId("");
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
                technician_ids: selectedIds,
                lead_technician_id: leadId,
                allow_technician_self_assignment: allowSelfAssignment,
                max_technicians: allowSelfAssignment ? maxTechnicians : selectedIds.length,
            },
            {
                preserveScroll: true,
                onError: setErrors,
                onSuccess: onClose,
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
                style={{ maxWidth: "640px", maxHeight: "92vh", overflowY: "auto" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-inquiry-title"
            >
                <div className="p-4 border-bottom d-flex align-items-start justify-content-between gap-3">
                    <div>
                        <div className="small text-primary fw-bold mb-1">INQUIRY {inquiry.inquiry_number}</div>
                        <h2 className="h4 fw-bold mb-1" id="confirm-inquiry-title">Confirm &amp; Schedule Service</h2>
                        <p className="text-muted small mb-0">Set the final appointment, choose the lead and supporting technicians, and decide whether other technicians may join.</p>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" disabled={processing} onClick={onClose} />
                </div>

                <form onSubmit={submit}>
                    <div className="p-4">
                        <div className="rounded-3 bg-light p-3 mb-4">
                            <div className="small text-muted">CUSTOMER</div>
                            <div className="fw-semibold">{inquiry.customer_name}</div>
                            <div className="small text-muted">{inquiry.service_type}{inquiry.item_name ? " · " + inquiry.item_name : ""}</div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirm-preferred-date" className="form-label fw-semibold">Service date</label>
                            <input
                                id="confirm-preferred-date"
                                type="date"
                                className={"form-control" + (errors.preferred_date ? " is-invalid" : "")}
                                value={preferredDate}
                                min={todayDate || undefined}
                                required
                                onChange={(event) => setPreferredDate(event.target.value)}
                            />
                            {errors.preferred_date && <div className="invalid-feedback">{errors.preferred_date}</div>}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirm-preferred-time" className="form-label fw-semibold">Service time slot</label>
                            <select
                                id="confirm-preferred-time"
                                className={"form-select" + (errors.preferred_time ? " is-invalid" : "")}
                                value={preferredTime}
                                required
                                onChange={(event) => setPreferredTime(event.target.value)}
                            >
                                {timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                            </select>
                            {errors.preferred_time && <div className="invalid-feedback">{errors.preferred_time}</div>}
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="fw-semibold mb-2">Technician team <span className="text-danger">*</span></div>
                            <div className="small text-muted mb-2">Select at least one technician. Every confirmed service must have a lead.</div>
                            {errors.technician_ids && <div className="alert alert-danger py-2">{errors.technician_ids}</div>}
                            {errors.lead_technician_id && <div className="alert alert-danger py-2">{errors.lead_technician_id}</div>}
                            {errors.technician_id && <div className="alert alert-danger py-2">{errors.technician_id}</div>}
                            {technicians.map((technician) => (
                                <label key={technician.id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                                    <input
                                        type="checkbox"
                                        className="form-check-input mt-0"
                                        checked={selectedIds.includes(String(technician.id))}
                                        onChange={(event) => toggleTechnician(technician.id, event.target.checked)}
                                    />
                                    <span className="flex-grow-1">
                                        <span className="d-block fw-semibold">{technician.name}</span>
                                        <span className="small text-muted">{technician.email}</span>
                                    </span>
                                    {String(technician.id) === leadId && <span className="badge bg-primary-subtle text-primary">Lead</span>}
                                </label>
                            ))}
                            {technicians.length === 0 && <div className="small text-danger mt-2">No technician accounts exist. Add a technician before confirming an inquiry.</div>}
                            {selectedIds.length === 0 && <div className="small text-danger mt-2">At least one technician must be selected.</div>}

                            <div className="mt-3">
                                <label htmlFor="confirm-lead-technician" className="form-label fw-semibold">Lead technician</label>
                                <select
                                    id="confirm-lead-technician"
                                    className={"form-select" + (errors.lead_technician_id ? " is-invalid" : "")}
                                    value={leadId}
                                    required
                                    onChange={(event) => setLeadId(event.target.value)}
                                >
                                    <option value="">Choose the lead</option>
                                    {technicians.filter((tech) => selectedIds.includes(String(tech.id))).map((tech) => (
                                        <option value={tech.id} key={tech.id}>{tech.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-check form-switch mb-3">
                            <input id="confirm-allow-self-assignment" className="form-check-input" type="checkbox" checked={allowSelfAssignment} onChange={(event) => setAllowSelfAssignment(event.target.checked)} />
                            <label htmlFor="confirm-allow-self-assignment" className="form-check-label fw-semibold">Allow other eligible technicians to join this job</label>
                            <div className="form-text">If enabled, additional technicians can volunteer from their staff workspace, subject to availability and the team-size limit.</div>
                        </div>

                        {allowSelfAssignment && (
                            <div className="mb-2">
                                <label htmlFor="confirm-max-technicians" className="form-label fw-semibold">Maximum team size</label>
                                <select id="confirm-max-technicians" className={"form-select" + (errors.max_technicians ? " is-invalid" : "")} value={maxTechnicians} onChange={(event) => setMaxTechnicians(event.target.value)}>
                                    {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                                        <option value={count} key={count}>{count} {count === 1 ? "technician" : "technicians"}</option>
                                    ))}
                                </select>
                                {errors.max_technicians && <div className="invalid-feedback">{errors.max_technicians}</div>}
                            </div>
                        )}

                        {errors.availability && <div className="alert alert-danger mt-3 mb-0" role="alert">{errors.availability}</div>}
                    </div>

                    <div className="border-top p-3 p-sm-4 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary fw-semibold" disabled={processing} onClick={onClose}>CANCEL</button>
                        <button type="submit" className="btn btn-primary fw-bold" disabled={processing || technicians.length === 0 || selectedIds.length === 0 || !selectedIds.includes(leadId) || (allowSelfAssignment && Number(maxTechnicians) < selectedIds.length)}>
                            {processing ? "CONFIRMING..." : "CONFIRM & ASSIGN TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
