import { router } from "@inertiajs/react";
import { useState } from "react";

export default function ManageTechnicianTeamModal({ inquiry, technicians = [], technicianBookings = [], onClose }) {
    const initialIds = (inquiry.technicians ?? []).map((technician) => String(technician.id));
    if (!initialIds.length && inquiry.technician?.id) initialIds.push(String(inquiry.technician.id));

    const [selectedIds, setSelectedIds] = useState(initialIds);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const isTechnicianBusy = (technicianId) => technicianBookings.some((booking) =>
        booking.inquiry_id !== inquiry.id &&
        booking.date === inquiry.preferred_date_value &&
        (booking.technician_ids ?? []).map(String).includes(String(technicianId))
    );

    const toggleTechnician = (id) => {
        const next = selectedIds.includes(id)
            ? selectedIds.filter((item) => item !== id)
            : [...selectedIds, id];

        setSelectedIds(next);
    };

    const submit = (event) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});

        router.patch("/admin/inquiries/" + inquiry.id + "/technician", {
            technician_ids: selectedIds,
        }, {
            preserveScroll: true,
            onError: setErrors,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ zIndex: 2000, backgroundColor: "rgba(15, 23, 42, 0.58)", overflowY: "auto" }}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onClose();
            }}>
            <div className="bg-white rounded-4 shadow-lg w-100" style={{ maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}
                role="dialog" aria-modal="true" aria-labelledby="team-modal-title">
                <div className="p-4 border-bottom d-flex justify-content-between gap-3">
                    <div>
                        <div className="small text-primary fw-bold">INQUIRY {inquiry.inquiry_number}</div>
                        <h2 className="h4 fw-bold mb-1" id="team-modal-title">Manage Technician Team</h2>
                        <p className="small text-muted mb-0">Choose which technicians are assigned to this job.</p>
                    </div>
                    <button type="button" className="btn-close" disabled={processing} onClick={onClose} aria-label="Close" />
                </div>

                <form onSubmit={submit}>
                    <div className="p-4">
                        {technicians.length === 0 ? (
                            <div className="alert alert-warning">No technician accounts are available.</div>
                        ) : technicians.map((technician) => (
                            <div key={technician.id} className="d-flex align-items-center gap-3 border rounded-3 p-3 mb-2">
                                <input className="form-check-input mt-0" type="checkbox"
                                    id={"team-tech-" + technician.id}
                                    checked={selectedIds.includes(String(technician.id))}
                                    disabled={isTechnicianBusy(technician.id) && !selectedIds.includes(String(technician.id))}
                                    onChange={() => toggleTechnician(String(technician.id))} />
                                <label className="flex-grow-1" htmlFor={"team-tech-" + technician.id}>
                                    <span className="fw-semibold d-block">{technician.name}</span>
                                    <span className="small text-muted">{technician.email}{isTechnicianBusy(technician.id) ? " · Busy in this time slot" : ""}</span>
                                </label>
                            </div>
                        ))}

                        {errors.technician_ids && <div className="small text-danger mt-2">{errors.technician_ids}</div>}

                    </div>

                    <div className="border-top p-3 d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary" disabled={processing} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary fw-bold"
                            disabled={processing || selectedIds.length === 0}>
                            {processing ? "SAVING..." : "SAVE TEAM"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
