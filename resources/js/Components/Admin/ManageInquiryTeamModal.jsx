import { router } from "@inertiajs/react";
import { useState } from "react";

export default function ManageInquiryTeamModal({ inquiry, technicians = [], onClose }) {
    const initialTeam = inquiry.technicians?.length
        ? inquiry.technicians.map((technician) => String(technician.id))
        : inquiry.technician?.id
            ? [String(inquiry.technician.id)]
            : [];
    const initialLead = inquiry.technicians?.find((technician) => technician.is_lead)?.id
        ?? inquiry.technician?.id
        ?? initialTeam[0]
        ?? "";

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
                if (leadTechnicianId === key) setLeadTechnicianId(next[0] || "");
                return next;
            }
            if (current.length >= 8) {
                setErrors((previous) => ({ ...previous, technician_ids: "A service can have up to 8 technicians." }));
                return current;
            }
            const next = [...current, key];
            if (!leadTechnicianId) setLeadTechnicianId(key);
            return next;
        });
        setErrors((previous) => ({ ...previous, technician_ids: undefined }));
    };

    const submit = (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});

        router.patch(
            "/admin/inquiries/" + inquiry.id + "/technicians",
            {
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

    const canSubmit = !processing
        && technicianIds.length > 0
        && technicianIds.includes(leadTechnicianId)
        && Number(maxTechnicians) >= technicianIds.length
        && Number(maxTechnicians) <= 8;

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ zIndex: 2000, backgroundColor: "rgba(15, 23, 42, 0.58)", overflowY: "auto" }}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onClose();
            }}
        >
            <div className="bg-white rounded-4 shadow-lg w-100" style={{ maxWidth: "620px", maxHeight: "92vh", overflowY: "auto" }} role="dialog" aria-modal="true" aria-labelledby="manage-team-title">
                <div className="p-4 border-bottom d-flex align-items-start justify-content-between gap-3">
                    <div>
                        <div className="small text-primary fw-bold mb-1">INQUIRY {inquiry.inquiry_number}</div>
                        <h2 className="h4 fw-bold mb-1" id="manage-team-title">Manage Technician Team</h2>
                        <p className="text-muted small mb-0">Assign the lead and supporting technicians for this service.</p>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" disabled={processing} onClick={onClose} />
                </div>

                <form onSubmit={submit}>
                    <div className="p-4">
                        <div className="rounded-3 bg-light p-3 mb-4">
                            <div className="fw-semibold">{inquiry.customer_name}</div>
                            <div className="small text-muted">{inquiry.service_type} · {inquiry.preferred_date} · {inquiry.preferred_time}</div>
                        </div>

                        <div className="form-label fw-semibold">Assigned technicians</div>
                        <div className="border rounded-3 p-2 mb-2" style={{ maxHeight: "230px", overflowY: "auto" }}>
                            {technicians.map((technician) => {
                                const id = String(technician.id);
                                const selected = technicianIds.includes(id);
                                return (
                                    <label key={technician.id} className="d-flex align-items-center gap-3 rounded-2 p-2" style={{ cursor: "pointer", background: selected ? "#eff6ff" : "transparent" }}>
                                        <input type="checkbox" className="form-check-input mt-0" checked={selected} disabled={processing} onChange={() => toggleTechnician(technician.id)} />
                                        <span className="flex-grow-1">
                                            <span className="d-block fw-semibold">{technician.name}</span>
                                            <span className="d-block small text-muted">{technician.email}</span>
                                        </span>
                                        {leadTechnicianId === id && <span className="badge text-bg-primary">Lead</span>}
                                    </label>
                                );
                            })}
                        </div>
                        {errors.technician_ids && <div className="small text-danger mb-3">{errors.technician_ids}</div>}

                        <div className="mb-3">
                            <label htmlFor="team-lead-technician" className="form-label fw-semibold">Lead technician</label>
                            <select id="team-lead-technician" className={"form-select" + (errors.lead_technician_id ? " is-invalid" : "")} required value={leadTechnicianId} onChange={(event) => setLeadTechnicianId(event.target.value)}>
                                <option value="">Choose a lead technician</option>
                                {technicians.filter((technician) => technicianIds.includes(String(technician.id))).map((technician) => (
                                    <option key={technician.id} value={String(technician.id)}>{technician.name}</option>
                                ))}
                            </select>
                            {errors.lead_technician_id && <div className="invalid-feedback">{errors.lead_technician_id}</div>}
                        </div>

                        <div className="form-check mb-3">
                            <input id="team-open-signups" className="form-check-input" type="checkbox" checked={allowAdditionalTechnicians} onChange={(event) => setAllowAdditionalTechnicians(event.target.checked)} />
                            <label htmlFor="team-open-signups" className="form-check-label fw-semibold">Allow other technicians to join</label>
                            <div className="form-text">Technicians can volunteer from their staff workspace until the team limit is reached.</div>
                        </div>

                        <div className="mb-1">
                            <label htmlFor="team-max-technicians" className="form-label fw-semibold">Maximum team size</label>
                            <select id="team-max-technicians" className={"form-select" + (errors.max_technicians ? " is-invalid" : "")} value={maxTechnicians} onChange={(event) => setMaxTechnicians(event.target.value)} required>
                                {[1,2,3,4,5,6,7,8].map((count) => <option key={count} value={String(count)}>{count} technician{count === 1 ? "" : "s"}</option>)}
                            </select>
                            {errors.max_technicians && <div className="invalid-feedback">{errors.max_technicians}</div>}
                        </div>
                    </div>

                    <div className="border-top p-3 p-sm-4 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary fw-semibold" disabled={processing} onClick={onClose}>CANCEL</button>
                        <button type="submit" className="btn btn-primary fw-bold" disabled={!canSubmit}>{processing ? "SAVING..." : "SAVE TECHNICIAN TEAM"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
