import { router } from "@inertiajs/react";
import { useState } from "react";

export default function ManageTechnicianTeam({ inquiry, technicians = [], onClose }) {
    const currentIds = (inquiry.technicians ?? []).map((tech) => String(tech.id));
    const [selectedIds, setSelectedIds] = useState(currentIds);
    const initialLead = inquiry.technicians?.find((tech) => tech.is_lead)?.id
        ?? inquiry.technician?.id
        ?? currentIds[0]
        ?? "";
    const [leadId, setLeadId] = useState(String(initialLead));
    const [allowSelfAssignment, setAllowSelfAssignment] = useState(Boolean(inquiry.allow_technician_self_assignment));
    const [maxTechnicians, setMaxTechnicians] = useState(String(Math.max(Number(inquiry.max_technicians ?? 1), currentIds.length, 1)));
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const toggleTechnician = (id, checked) => {
        const next = checked
            ? Array.from(new Set([...selectedIds, String(id)]))
            : selectedIds.filter((selected) => selected !== String(id));

        setSelectedIds(next);
        setMaxTechnicians((current) => String(Math.max(Number(current) || 1, next.length, 1)));
        if (!next.includes(leadId)) setLeadId(next[0] ?? "");
    };

    const submit = (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});

        router.patch("/admin/inquiries/" + inquiry.id + "/technicians", {
            technician_ids: selectedIds,
            lead_technician_id: leadId,
            allow_technician_self_assignment: allowSelfAssignment,
            max_technicians: allowSelfAssignment ? maxTechnicians : selectedIds.length,
        }, {
            preserveScroll: true,
            onError: setErrors,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 2001, backgroundColor: "rgba(15, 23, 42, 0.58)", overflowY: "auto" }}>
            <div className="bg-white rounded-4 shadow-lg w-100" style={{ maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }} role="dialog" aria-modal="true" aria-labelledby="team-manager-title">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <div className="small text-primary fw-bold">INQUIRY {inquiry.inquiry_number}</div>
                        <h2 className="h4 fw-bold mb-1" id="team-manager-title">Manage Technician Team</h2>
                        <p className="small text-muted mb-0">Select the staff assigned to this job and designate the lead technician.</p>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" disabled={processing} onClick={onClose} />
                </div>
                <form onSubmit={submit}>
                    <div className="p-4">
                        {errors.technician_ids && <div className="alert alert-danger py-2">{errors.technician_ids}</div>}
                        {errors.lead_technician_id && <div className="alert alert-danger py-2">{errors.lead_technician_id}</div>}
                        {errors.allow_technician_self_assignment && <div className="alert alert-danger py-2">{errors.allow_technician_self_assignment}</div>}
                        {errors.max_technicians && <div className="alert alert-danger py-2">{errors.max_technicians}</div>}
                        <div className="border rounded-3 p-3 mb-3">
                            <div className="fw-semibold mb-2">Assigned technicians <span className="text-danger">*</span></div>
                            {technicians.map((technician) => (
                                <label key={technician.id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                                    <input type="checkbox" className="form-check-input mt-0" checked={selectedIds.includes(String(technician.id))} onChange={(event) => toggleTechnician(technician.id, event.target.checked)} />
                                    <span className="flex-grow-1">
                                        <span className="d-block fw-semibold">{technician.name}</span>
                                        <span className="small text-muted">{technician.email}</span>
                                    </span>
                                    {String(technician.id) === leadId && <span className="badge bg-primary-subtle text-primary">Lead</span>}
                                </label>
                            ))}
                            {technicians.length === 0 && <p className="text-danger small mb-0">Create a technician account before scheduling this job.</p>}
                            {selectedIds.length === 0 && <p className="small text-danger mt-2 mb-0">At least one technician must remain assigned.</p>}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="lead-technician" className="form-label fw-semibold">Lead technician</label>
                            <select id="lead-technician" className={"form-select" + (errors.lead_technician_id ? " is-invalid" : "")} value={leadId} required onChange={(event) => setLeadId(event.target.value)}>
                                <option value="">Choose the lead</option>
                                {technicians.filter((tech) => selectedIds.includes(String(tech.id))).map((tech) => (
                                    <option value={tech.id} key={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-check form-switch mb-3">
                            <input id="allow-self-assignment" className="form-check-input" type="checkbox" checked={allowSelfAssignment} onChange={(event) => setAllowSelfAssignment(event.target.checked)} />
                            <label htmlFor="allow-self-assignment" className="form-check-label fw-semibold">Allow other eligible technicians to join this job</label>
                            <div className="form-text">When enabled, technicians can volunteer until the team reaches its maximum size.</div>
                        </div>

                        {allowSelfAssignment && (
                            <div className="mb-2">
                                <label htmlFor="max-technicians" className="form-label fw-semibold">Maximum team size</label>
                                <select id="max-technicians" className={"form-select" + (errors.max_technicians ? " is-invalid" : "")} value={maxTechnicians} onChange={(event) => setMaxTechnicians(event.target.value)}>
                                    {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                                        <option value={count} key={count}>{count} {count === 1 ? "technician" : "technicians"}</option>
                                    ))}
                                </select>
                                {errors.max_technicians && <div className="invalid-feedback">{errors.max_technicians}</div>}
                                {Number(maxTechnicians) < selectedIds.length && <div className="small text-danger mt-1">Maximum team size must be at least {selectedIds.length}.</div>}
                            </div>
                        )}
                    </div>
                    <div className="border-top p-3 p-sm-4 d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary" disabled={processing} onClick={onClose}>CANCEL</button>
                        <button type="submit" className="btn btn-primary fw-bold" disabled={processing || selectedIds.length === 0 || !selectedIds.includes(leadId) || (allowSelfAssignment && Number(maxTechnicians) < selectedIds.length)}>
                            {processing ? "SAVING..." : "SAVE TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
