import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Calendar from "../../Components/Admin/Calendar";
import Announcements from "../../Components/Admin/Announcements";
import AnnouncementFeed from "../../Components/Admin/AnnouncementFeed";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { googleMapsDirectionsUrl } from "../../Components/GoogleMaps/ServiceLocation";
import TechnicianSidebar from "../../Components/Technician/Sidebar";

function statusClass(status) {
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "in_progress") return "bg-primary-subtle text-primary";
    if (status === "pending") return "bg-warning-subtle text-warning-emphasis";
    return "bg-info-subtle text-info-emphasis";
}

function formatStatus(status) {
    return String(status ?? "").replaceAll("_", " ");
}

function priorityClass(urgency) {
    if (urgency === "emergency") return "bg-danger-subtle text-danger";
    if (urgency === "urgent") return "bg-warning-subtle text-warning-emphasis";
    return "bg-light text-secondary border";
}

function stockClass(quantity) {
    if (Number(quantity) <= 0) return "bg-danger-subtle text-danger";
    if (Number(quantity) <= 5) return "bg-warning-subtle text-warning-emphasis";
    return "bg-success-subtle text-success";
}

function productImageSource(product) {
    const image = product?.image || (Array.isArray(product?.images) ? product.images[0] : "");
    if (!image) return "";
    if (/^https?:\/\//i.test(image) || String(image).startsWith("/")) return image;
    return "/storage/" + String(image).replace(/^\/+/, "");
}

function JobCard({ job, open = false, products = [] }) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState("");
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(job.preferred_date_value || "");
    const [scheduleTime, setScheduleTime] = useState(job.preferred_time || "08:00 AM - 11:00 AM");
    const [scheduleError, setScheduleError] = useState("");
    const paymentBlocked = Boolean(job.payment_status && !["paid", "not_applicable"].includes(job.payment_status));
    const [showServiceReport, setShowServiceReport] = useState(false);
    const [serviceReportErrors, setServiceReportErrors] = useState({});
    const [serviceReport, setServiceReport] = useState({
        work_summary: "",
        customer_notes: "",
        labor_charge: "0",
        additional_charge: "0",
        items: [],
    });
    const timeSlots = ["08:00 AM - 11:00 AM", "11:00 AM - 02:00 PM", "02:00 PM - 05:00 PM"];

    const claim = () => {
        setWorking(true);
        setError("");
        router.post("/technician/jobs/" + job.id + "/claim", {}, {
            preserveScroll: true,
            onError: (errors) => setError(errors.job ?? "Unable to join this job."),
            onFinish: () => setWorking(false),
        });
    };

    const updateStatus = (status) => {
        if (status === "completed") {
            setServiceReportErrors({});
            setShowServiceReport(true);
            return;
        }

        setWorking(true);
        setError("");
        router.patch("/technician/jobs/" + job.id + "/status", { status }, {
            preserveScroll: true,
            onError: (errors) => setError(errors.status ?? "Unable to update job status."),
            onFinish: () => setWorking(false),
        });
    };

    const updateReportField = (field, value) => {
        setServiceReport((current) => ({ ...current, [field]: value }));
    };

    const addReportItem = () => {
        setServiceReport((current) => ({
            ...current,
            items: [...current.items, {
                action: "used",
                product_id: "",
                product_name: "",
                quantity: "1",
                unit_price: "0",
                notes: "",
            }],
        }));
    };

    const updateReportItem = (index, field, value) => {
        setServiceReport((current) => {
            const items = current.items.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                if (field === "action") {
                    return { ...item, action: value, product_id: "", product_name: "", unit_price: "0" };
                }
                if (field === "product_id") {
                    const selected = products.find((product) => String(product.id) === String(value));
                    return {
                        ...item,
                        product_id: value,
                        product_name: selected?.name ?? "",
                        unit_price: selected ? String(selected.price ?? 0) : "0",
                    };
                }
                return { ...item, [field]: value };
            });
            return { ...current, items };
        });
    };

    const submitServiceReport = (event) => {
        event.preventDefault();
        setWorking(true);
        setServiceReportErrors({});
        router.post("/technician/jobs/" + job.id + "/post-service-record", serviceReport, {
            preserveScroll: true,
            onError: (errors) => setServiceReportErrors(errors ?? {}),
            onSuccess: () => setShowServiceReport(false),
            onFinish: () => setWorking(false),
        });
    };

    const reviewReschedule = (decision) => {
        setWorking(true);
        setScheduleError("");
        router.patch("/technician/jobs/" + job.id + "/reschedule/" + decision, {}, {
            preserveScroll: true,
            onError: (errors) => setScheduleError(errors.reschedule || "Unable to review reschedule request."),
            onFinish: () => setWorking(false),
        });
    };

    const saveSchedule = (event) => {
        event.preventDefault();
        setWorking(true);
        setScheduleError("");
        router.patch("/technician/jobs/" + job.id + "/schedule", {
            preferred_date: scheduleDate,
            preferred_time: scheduleTime,
        }, {
            preserveScroll: true,
            onError: (errors) => setScheduleError(errors.preferred_date || errors.preferred_time || errors.schedule || "Unable to update schedule."),
            onSuccess: () => setEditingSchedule(false),
            onFinish: () => setWorking(false),
        });
    };

    return (
        <article className="technician-job-card bg-white border rounded-4 p-3 p-lg-4 h-100" style={{ boxShadow: "0 4px 18px rgba(15,23,42,0.045)" }}>
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                <div>
                    <div className="small text-primary fw-bold">Service # {job.inquiry_number}</div>
                    <h3 className="h5 fw-bold mb-1">{job.service_type}</h3>
                    <div className="small text-muted">{job.item_name || "General service"}</div>
                </div>
                {!open && <span className={"badge rounded-pill text-capitalize px-3 py-2 " + statusClass(job.status)}>{formatStatus(job.status)}</span>}
                {open && <span className={"badge rounded-pill " + (paymentBlocked ? "text-bg-warning" : job.status === "pending" ? "text-bg-secondary" : "text-bg-success")}>{paymentBlocked ? "Payment pending" : job.status === "pending" ? "Awaiting review" : "Available to join"}</span>}
            </div>

            <div className="row g-2 small mb-3">
                <div className="col-6">
                    <div className="text-muted"><i className="bi bi-calendar3 me-1" /> DATE</div>
                    <div className="fw-semibold">{job.preferred_date || "Not set"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted"><i className="bi bi-clock me-1" /> TIME</div>
                    <div className="fw-semibold">{job.preferred_time || "Not set"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted"><i className="bi bi-geo-alt me-1" /> LOCATION</div>
                    <div className="fw-semibold">{job.city || "Not specified"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted">PRIORITY</div>
                    <div><span className={"badge rounded-pill text-capitalize " + priorityClass(job.urgency)}>{job.urgency || "Normal"}</span></div>
                </div>
                {job.payment_status && job.payment_status !== "not_applicable" && (
                    <div className="col-12">
                        <div className="text-muted">PAYMENT STATUS</div>
                        <span className={"badge rounded-pill text-capitalize " + (job.payment_status === "paid" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning-emphasis")}>{job.payment_status.replaceAll("_", " ")}</span>
                    </div>
                )}
            </div>

            {job.technicians?.length > 0 && (
                <div className="assigned-team-panel rounded-3 p-3 mb-3">
                    <div className="assigned-team-label small fw-semibold mb-2">ASSIGNED TEAM</div>
                    <div className="d-flex flex-wrap gap-2">
                        {job.technicians.map((technician) => (
                            <span key={technician.id} className="assigned-team-chip badge rounded-pill border">
                                {technician.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {job.customer_name && (
                <div className="border-top pt-3 mb-3">
                    <div className="small text-muted fw-semibold mb-2">CUSTOMER DETAILS</div>
                    <div className="fw-semibold">{job.customer_name}</div>
                    {job.customer_phone && <div className="small"><a href={"tel:" + job.customer_phone}>{job.customer_phone}</a></div>}
                    {job.street_address && <div className="small text-muted mt-1">{job.street_address}, {job.city}</div>}
                    {job.address_details && <div className="small text-muted mt-1"><span className="fw-semibold">Entrance details:</span> {job.address_details}</div>}
                    {(job.google_place_id || job.service_latitude !== null && job.service_latitude !== undefined || job.street_address) && (
                        <a
                            href={googleMapsDirectionsUrl({
                                latitude: job.service_latitude,
                                longitude: job.service_longitude,
                                placeId: job.google_place_id,
                                streetAddress: job.street_address,
                                city: job.city,
                                addressDetails: job.address_details,
                            })}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-primary btn-sm fw-semibold mt-2"
                        >
                            <i className="bi bi-sign-turn-right me-2" />NAVIGATE TO SERVICE
                        </a>
                    )}
                    {job.notes && <div className="small mt-2"><span className="fw-semibold">Notes:</span> {job.notes}</div>}
                </div>
            )}

            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}

            {paymentBlocked && open && (
                <div className="alert alert-warning py-2 small" role="status">
                    Payment must be confirmed before a technician can join or start this service.
                </div>
            )}

            {open ? (
                <button className="btn btn-primary w-100 fw-bold" disabled={working || paymentBlocked} onClick={claim}>
                    {working ? "JOINING..." : "JOIN THIS SERVICE"}
                </button>
            ) : job.status === "confirmed" ? (
                <button className="btn btn-primary w-100 fw-bold" disabled={working} onClick={() => updateStatus("in_progress")}>
                    {working ? "UPDATING..." : "START JOB"}
                </button>
            ) : job.status === "in_progress" ? (
                <button className="btn btn-success w-100 fw-bold" disabled={working} onClick={() => updateStatus("completed")}>
                    <i className="bi bi-journal-check me-2" />POST SERVICE RECORD
                </button>
            ) : job.status === "completed" ? (
                <div className="small text-success fw-semibold"><i className="bi bi-check-circle-fill me-1" />This job is completed.</div>
            ) : (
                <div className="alert alert-warning py-2 small mb-0" role="status">
                    <i className="bi bi-hourglass-split me-1" />You have joined this service. It will become actionable after an administrator confirms the booking.
                </div>
            )}

            {!open && job.status === "in_progress" && showServiceReport && (
                <form onSubmit={submitServiceReport} className="mt-3 border rounded-4 bg-body-tertiary p-3 p-lg-4">
                    <div className="d-flex align-items-start gap-2 mb-3">
                        <span className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary" style={{ width: 40, height: 40 }}>
                            <i className="bi bi-journal-medical fs-5" />
                        </span>
                        <div>
                            <h4 className="h5 fw-bold mb-1">Post-Service Record</h4>
                            <p className="small text-secondary mb-0">Record the work performed and every shop product taken for the job before completing it.</p>
                        </div>
                    </div>

                    {Object.entries(serviceReportErrors).map(([field, messages]) => (
                        <div className="small text-danger mb-1" key={field}>{Array.isArray(messages) ? messages[0] : messages}</div>
                    ))}

                    <label className="form-label fw-semibold">Work performed <span className="text-danger">*</span></label>
                    <textarea
                        className={"form-control mb-3 " + (serviceReportErrors.work_summary ? "is-invalid" : "")}
                        rows={3}
                        minLength={10}
                        maxLength={5000}
                        required
                        value={serviceReport.work_summary}
                        onChange={(event) => updateReportField("work_summary", event.target.value)}
                        placeholder="Describe diagnostics, repairs, configuration, tests, and result."
                    />

                    <div className="row g-2 mb-3">
                        <div className="col-sm-6">
                            <label className="form-label fw-semibold">Labor / service income (₱)</label>
                            <input type="number" min="0" step="0.01" max="10000000" className="form-control" value={serviceReport.labor_charge} onChange={(event) => updateReportField("labor_charge", event.target.value)} required />
                        </div>
                        <div className="col-sm-6">
                            <label className="form-label fw-semibold">Other service charge (₱)</label>
                            <input type="number" min="0" step="0.01" max="10000000" className="form-control" value={serviceReport.additional_charge} onChange={(event) => updateReportField("additional_charge", event.target.value)} />
                        </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <h5 className="h6 fw-bold mb-0">Parts used or removed</h5>
                        <button type="button" className="btn btn-sm btn-outline-primary fw-semibold" onClick={addReportItem} disabled={working || serviceReport.items.length >= 20}>
                            <i className="bi bi-plus-lg me-1" />ADD PART
                        </button>
                    </div>
                    <p className="small text-secondary mb-3">“Used from shop stock” deducts the quantity and creates an inventory audit. “Removed from customer site” records the old part without changing shop stock.</p>

                    {serviceReport.items.map((item, index) => (
                        <div className="border rounded-3 bg-body p-3 mb-2" key={index}>
                            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                <strong className="small">Part {index + 1}</strong>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setServiceReport((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={"Remove part " + (index + 1)}>
                                    <i className="bi bi-trash" />
                                </button>
                            </div>
                            <div className="row g-2">
                                <div className="col-12 col-md-4">
                                    <label className="form-label small fw-semibold">Record type</label>
                                    <select className="form-select form-select-sm" value={item.action} onChange={(event) => updateReportItem(index, "action", event.target.value)}>
                                        <option value="used">Used from shop stock</option>
                                        <option value="removed">Removed from customer site</option>
                                    </select>
                                </div>
                                <div className="col-12 col-md-8">
                                    <label className="form-label small fw-semibold">{item.action === "used" ? "Shop product" : "Removed product / component"}</label>
                                    {item.action === "used" ? (
                                        <select className="form-select form-select-sm" required value={item.product_id} onChange={(event) => updateReportItem(index, "product_id", event.target.value)}>
                                            <option value="">Select product from inventory</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.name} · {product.stock_quantity} in stock</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input className="form-control form-control-sm" required maxLength={180} value={item.product_name} onChange={(event) => updateReportItem(index, "product_name", event.target.value)} placeholder="e.g. damaged camera, old HDD, cable section" />
                                    )}
                                </div>
                                <div className="col-6 col-md-3">
                                    <label className="form-label small fw-semibold">Quantity</label>
                                    <input className="form-control form-control-sm" type="number" min="1" max="10000" step="1" required value={item.quantity} onChange={(event) => updateReportItem(index, "quantity", event.target.value)} />
                                </div>
                                {item.action === "used" && (
                                    <div className="col-6 col-md-3">
                                        <label className="form-label small fw-semibold">Charge per unit (₱)</label>
                                        <input className="form-control form-control-sm" type="number" min="0" max="10000000" step="0.01" value={item.unit_price} onChange={(event) => updateReportItem(index, "unit_price", event.target.value)} />
                                    </div>
                                )}
                                <div className="col-12 col-md">
                                    <label className="form-label small fw-semibold">Part notes (optional)</label>
                                    <input className="form-control form-control-sm" maxLength={1000} value={item.notes} onChange={(event) => updateReportItem(index, "notes", event.target.value)} placeholder="Condition / reason / serial details" />
                                </div>
                            </div>
                        </div>
                    ))}

                    <label className="form-label fw-semibold mt-2">Customer-facing notes (optional)</label>
                    <textarea className="form-control mb-3" rows={2} maxLength={3000} value={serviceReport.customer_notes} onChange={(event) => updateReportField("customer_notes", event.target.value)} placeholder="Recommendations, replaced parts, and follow-up advice." />

                    <div className="d-flex flex-column flex-sm-row gap-2">
                        <button type="submit" className="btn btn-success fw-bold flex-grow-1" disabled={working}>
                            {working ? <><span className="spinner-border spinner-border-sm me-2" />SAVING RECORD...</> : <><i className="bi bi-check2-circle me-2" />SAVE RECORD & COMPLETE JOB</>}
                        </button>
                        <button type="button" className="btn btn-outline-secondary fw-semibold" disabled={working} onClick={() => setShowServiceReport(false)}>CANCEL</button>
                    </div>
                </form>
            )}

            {!open && job.status === "completed" && job.service_record && (
                <div className="mt-3 border rounded-3 bg-body-tertiary p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                            <div className="fw-bold"><i className="bi bi-journal-check me-2 text-success" />Post-Service Record</div>
                            <div className="small text-secondary mt-1">{job.service_record.work_summary}</div>
                        </div>
                        <span className="badge rounded-pill bg-success-subtle text-success">Saved</span>
                    </div>
                    <div className="fw-bold text-success mt-2">Recorded income: ₱{Number(job.service_record.total_income ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    {(job.service_record.items ?? []).length > 0 && (
                        <ul className="small mt-2 mb-0 ps-3">
                            {job.service_record.items.map((item, index) => (
                                <li key={index}>{item.action === "used" ? "Used" : "Removed"}: {item.product_name} × {item.quantity}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {!open && job.status === "confirmed" && job.reschedule_request_status === "pending" && (
                <div className="mt-3 border rounded-3 bg-warning-subtle p-3">
                    <div className="fw-bold small mb-1">Customer reschedule request</div>
                    <div className="small">{job.reschedule_requested_date} · {job.reschedule_requested_time}</div>
                    {job.reschedule_request_note && <div className="small text-muted mt-1">{job.reschedule_request_note}</div>}
                    {scheduleError && <div className="small text-danger mt-2">{scheduleError}</div>}
                    <div className="d-flex gap-2 mt-2">
                        <button type="button" className="btn btn-success btn-sm flex-grow-1" disabled={working} onClick={() => reviewReschedule("approve")}>Approve</button>
                        <button type="button" className="btn btn-outline-danger btn-sm flex-grow-1" disabled={working} onClick={() => reviewReschedule("decline")}>Decline</button>
                    </div>
                </div>
            )}

            {!open && job.status === "confirmed" && (
                <div className="mt-3 border-top pt-3">
                    <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={() => setEditingSchedule((value) => !value)}>
                        {editingSchedule ? "Cancel schedule change" : "Change service schedule"}
                    </button>
                    {editingSchedule && (
                        <form onSubmit={saveSchedule} className="bg-light border rounded-3 p-3 mt-2">
                            <label className="form-label small fw-semibold">New date</label>
                            <input type="date" min={new Date().toLocaleDateString("en-CA")} className="form-control form-control-sm mb-2" value={scheduleDate} required onChange={(event) => setScheduleDate(event.target.value)} />
                            <label className="form-label small fw-semibold">New time slot</label>
                            <select className="form-select form-select-sm mb-2" value={scheduleTime} required onChange={(event) => setScheduleTime(event.target.value)}>
                                {timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                            </select>
                            {scheduleError && <div className="alert alert-danger py-2 small">{scheduleError}</div>}
                            <button type="submit" className="btn btn-primary btn-sm w-100" disabled={working || !scheduleDate}>{working ? "SAVING..." : "SAVE SCHEDULE"}</button>
                        </form>
                    )}
                </div>
            )}
        </article>
    );
}

export default function TechnicianWorkspace({ jobs = [], openJobs = [], inventory = [], recentNotifications = [], serviceHistory = [], activePage = "dashboard", recentServices = [], recentAnnouncements = [], scheduleData = [], upcomingScheduleCount = 0, calendarAvailability = { fullyBookedDates: [], partiallyBlockedDates: [] }, unreadNotificationCount = 0 }) {
    const { props } = usePage();
    const [recentNotificationsPage, setRecentNotificationsPage] = useState(1);
    const serviceHistoryRows = serviceHistory?.data ?? [];
    const serviceHistoryTotal = serviceHistory?.total ?? serviceHistoryRows.length;
    const notificationPageSize = 3;
    const notificationPageCount = Math.ceil(recentNotifications.length / notificationPageSize);
    const safeNotificationPage = Math.min(recentNotificationsPage, Math.max(1, notificationPageCount));
    const visibleNotifications = recentNotifications.slice(
        (safeNotificationPage - 1) * notificationPageSize,
        safeNotificationPage * notificationPageSize
    );
    const [stockChanges, setStockChanges] = useState({});
    const [stockErrors, setStockErrors] = useState({});
    const [savingProduct, setSavingProduct] = useState(null);
    const [jobFilter, setJobFilter] = useState("active");
    const [availableJobSearch, setAvailableJobSearch] = useState("");
    const [inventorySearch, setInventorySearch] = useState("");
    const [inventoryFilter, setInventoryFilter] = useState("all");
        const upcomingTechnicianJobs = useMemo(() => jobs
        .filter((job) => ["confirmed", "in_progress"].includes(job.status) && job.preferred_date_value)
        .sort((a, b) => String(a.preferred_date_value).localeCompare(String(b.preferred_date_value)))
        .slice(0, 50)
        .map((job) => ({
            id: job.id,
            title: job.service_type,
            date: job.preferred_date,
            date_value: job.preferred_date_value,
            time: job.preferred_time,
            customer_name: job.customer_name,
            description: job.city,
            inquiry_number: job.inquiry_number,
            status: job.status,
            urgency: job.urgency,
        })), [jobs]);

    const activeJobs = useMemo(
        () => jobs.filter((job) => ["pending", "confirmed", "in_progress"].includes(job.status)),
        [jobs]
    );
    const inProgressJobs = useMemo(
        () => jobs.filter((job) => job.status === "in_progress"),
        [jobs]
    );
    const completedJobs = useMemo(
        () => jobs.filter((job) => job.status === "completed"),
        [jobs]
    );
    const filteredJobs = useMemo(() => {
        if (jobFilter === "active") return activeJobs;
        if (jobFilter === "pending") return jobs.filter((job) => job.status === "pending");
        if (jobFilter === "confirmed") return jobs.filter((job) => job.status === "confirmed");
        if (jobFilter === "in_progress") return inProgressJobs;
        if (jobFilter === "completed") return completedJobs;
        return jobs;
    }, [jobFilter, jobs, activeJobs, inProgressJobs, completedJobs]);

    const filteredOpenJobs = useMemo(() => {
        const query = availableJobSearch.trim().toLowerCase();
        if (!query) return openJobs;
        return openJobs.filter((job) => [
            job.inquiry_number,
            job.service_type,
            job.item_name,
            job.city,
            job.urgency,
            ...(job.technicians ?? []).map((technician) => technician.name),
        ].some((value) => String(value ?? "").toLowerCase().includes(query)));
    }, [openJobs, availableJobSearch]);

    const filteredInventory = useMemo(() => {
        const query = inventorySearch.trim().toLowerCase();
        return inventory.filter((product) => {
            const matchesSearch = !query || [product.name, product.brand, product.category, product.warranty, String(product.id)]
                .some((value) => String(value ?? "").toLowerCase().includes(query));
            const quantity = Number(product.stock_quantity ?? 0);
            const matchesFilter = inventoryFilter === "low"
                ? quantity > 0 && quantity <= 5
                : inventoryFilter === "out"
                    ? quantity <= 0
                    : true;
            return matchesSearch && matchesFilter;
        });
    }, [inventory, inventorySearch, inventoryFilter]);

    const adjustStock = (event, product) => {
        event.preventDefault();
        setStockErrors({});
        setSavingProduct(product.id);

        router.patch("/technician/inventory/" + product.id, {
            quantity_change: stockChanges[product.id]?.change ?? "",
            reason: stockChanges[product.id]?.reason ?? "",
        }, {
            preserveScroll: true,
            onError: (errors) => setStockErrors((current) => ({ ...current, [product.id]: errors })),
            onSuccess: () => {
                setStockChanges((current) => ({ ...current, [product.id]: { change: "", reason: "" } }));
            },
            onFinish: () => setSavingProduct(null),
        });
    };

    const updateStockField = (productId, field, value) => {
        setStockChanges((current) => ({
            ...current,
            [productId]: { ...(current[productId] ?? {}), [field]: value },
        }));
    };

    const pageTitles = {
        dashboard: "Technician Workspace",
        services: "My Services",
        "available-jobs": "Available Jobs",
        "post-service-records": "Post-Service Records",
        "service-history": "Service History",
        products: "Products",
        schedule: "My Schedule",
    };
    const pageDescriptions = {
    "dashboard": "A quick overview of your workload, upcoming appointments, and technician tools.",
    "services": "Review assigned service jobs, open their details, and update service progress.",
    "available-jobs": "Find available team jobs that fit your schedule and have room for another technician.",
    "post-service-records": "Review the work summaries, parts, and service income saved after completed services.",
    "service-history": "Browse completed services assigned to you, including whether a Post-Service Record was saved.",
    "products": "View the product catalog and current stock, and record stock adjustments with a reason.",
    "schedule": "Review your assigned appointments and service dates."
};
    const pageTitle = pageTitles[activePage] ?? pageTitles.dashboard;
    const pageDescription = pageDescriptions[activePage] ?? pageDescriptions.dashboard;

        return (
        <div className="technician-workspace">
            <Navbar />
            <style>{`
                .technician-workspace { background: #f4f7fb; }
                .technician-workspace .technician-main-content { min-width: 0; background: #f5f6f8; }
                .technician-workspace .technician-sidebar-column { min-width: 0; background: var(--bs-body-bg); }
                .technician-workspace .technician-sidebar-column .admin-sidebar-desktop { min-height: calc(100vh - 70px) !important; height: 100%; }
                .technician-workspace .technician-content { min-width: 0; }
                .technician-workspace .technician-right-sidebar { min-width: 0; }
                .technician-workspace .technician-empty-state { background: #f8fafc; }
                .technician-workspace .workspace-hero {
                    background: linear-gradient(125deg, #ffffff 0%, #f1f6ff 100%);
                    border: 1px solid #dce6f3;
                    border-radius: 20px;
                }
                .technician-workspace .workspace-section {
                    background: #fff;
                    border: 1px solid #e0e7f0;
                    border-radius: 18px;
                    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.035);
                }
                .technician-workspace .workspace-stat {
                    transition: transform .16s ease, box-shadow .16s ease;
                }
                .technician-workspace .workspace-stat:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(15, 23, 42, .07);
                }
                .technician-workspace .stat-icon {
                    width: 42px; height: 42px; border-radius: 13px;
                    display: inline-flex; align-items: center; justify-content: center;
                    font-size: 1.15rem; flex-shrink: 0;
                }
                .technician-workspace .technician-job-card {
                    border-top: 3px solid #2f73e8 !important;
                    transition: transform .16s ease, box-shadow .16s ease;
                }
                .technician-workspace .technician-job-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 26px rgba(15, 23, 42, .08) !important;
                }
                .technician-workspace .workspace-table thead th {
                    font-size: .75rem; text-transform: uppercase; letter-spacing: .045em;
                    color: #5d6b80; white-space: nowrap; padding-top: .85rem; padding-bottom: .85rem;
                }
                .technician-workspace .workspace-table tbody td { padding-top: .75rem; padding-bottom: .75rem; }
                .technician-workspace .workspace-filter.active { background: #1769ed; color: #fff; border-color: #1769ed; }
                .technician-workspace .workspace-filter:not(.active) { background: #fff; color: #526174; border-color: #d8e0eb; }

                .technician-workspace .assigned-team-panel {
                    background: #f1f5f9;
                    color: #1e293b;
                    border: 1px solid #cbd5e1;
                }
                .technician-workspace .assigned-team-label {
                    color: #334155;
                    letter-spacing: .035em;
                }
                .technician-workspace .assigned-team-chip {
                    background: #fff;
                    color: #1e293b;
                    border-color: #cbd5e1 !important;
                    font-weight: 600;
                    padding: .42rem .7rem;
                }

                html[data-bs-theme="dark"] .technician-workspace .technician-sidebar-column { background: var(--bs-body-bg) !important; }
                html[data-bs-theme="dark"] .technician-workspace .technician-main-content { background: #111827 !important; }
                html[data-bs-theme="dark"] .technician-workspace .technician-main { background: #111827 !important; }
                html[data-bs-theme="dark"] .technician-workspace { --technician-canvas: #111827; }
                html[data-bs-theme="dark"] .technician-workspace {
                    background: var(--bs-body-bg);
                    color: var(--bs-body-color);
                }
                html[data-bs-theme="dark"] .technician-workspace .technician-empty-state { background: #18212f !important; border-color: #405169 !important; }
                html[data-bs-theme="dark"] .technician-workspace .workspace-hero,
                html[data-bs-theme="dark"] .technician-workspace .workspace-section,
                html[data-bs-theme="dark"] .technician-workspace .workspace-stat,
                html[data-bs-theme="dark"] .technician-workspace .technician-job-card,
                html[data-bs-theme="dark"] .technician-workspace .card {
                    background: #1f2937 !important;
                    color: #e5e7eb;
                    border-color: #405169 !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .workspace-hero {
                    background: linear-gradient(125deg, #1f2937 0%, #19273a 100%) !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .workspace-stat .display-6,
                html[data-bs-theme="dark"] .technician-workspace .technician-job-card h3,
                html[data-bs-theme="dark"] .technician-workspace .card h5,
                html[data-bs-theme="dark"] .technician-workspace .card h2 {
                    color: #f3f6fb !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .text-dark {
                    color: #f3f6fb !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .text-secondary,
                html[data-bs-theme="dark"] .technician-workspace .text-muted {
                    color: #bfcbd9 !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .bg-light,
                html[data-bs-theme="dark"] .technician-workspace .bg-body-tertiary {
                    background: #18212f !important;
                    color: #e5e7eb;
                }
                html[data-bs-theme="dark"] .technician-workspace .workspace-table {
                    --bs-table-color: #e5e7eb;
                    --bs-table-bg: #1f2937;
                    --bs-table-border-color: #405169;
                    --bs-table-striped-bg: #243244;
                    --bs-table-hover-bg: #2b3b50;
                    --bs-table-hover-color: #fff;
                }
                html[data-bs-theme="dark"] .technician-workspace .workspace-table thead th {
                    color: #d6e0eb;
                }
                html[data-bs-theme="dark"] .technician-workspace .form-control,
                html[data-bs-theme="dark"] .technician-workspace .form-select,
                html[data-bs-theme="dark"] .technician-workspace .input-group-text {
                    background-color: #111827;
                    border-color: #475569;
                    color: #f3f6fb;
                }
                html[data-bs-theme="dark"] .technician-workspace .form-control::placeholder {
                    color: #94a3b8;
                }
                html[data-bs-theme="dark"] .technician-workspace .workspace-filter:not(.active) {
                    background: #263449;
                    border-color: #475569;
                    color: #dce5f0;
                }

                html[data-bs-theme="dark"] .technician-workspace .assigned-team-panel {
                    background: #111827 !important;
                    border-color: #405169 !important;
                    color: #e5e7eb !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .assigned-team-label {
                    color: #cbd5e1 !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .assigned-team-chip {
                    background: #273449 !important;
                    color: #f8fafc !important;
                    border-color: #52647d !important;
                }
                html[data-bs-theme="dark"] .technician-workspace .border {
                    border-color: #405169 !important;
                }
                @media (prefers-reduced-motion: reduce) {
                    .technician-workspace .workspace-stat, .technician-workspace .technician-job-card { transition: none; }
                }
            `}</style>
            <main className="technician-main" style={{ minHeight: "calc(100vh - 70px)", fontFamily: "Outfit, sans-serif" }}>
                <div className="container-fluid px-0">
                    <div className="row g-0 align-items-stretch">
                        <aside className="col-12 col-md-3 col-lg-2 px-0 technician-sidebar-column">
                            <TechnicianSidebar active={activePage} />
                        </aside>
                        <div className="col-12 col-md-9 col-lg-10 p-3 p-md-4 min-vh-100 technician-main-content">
                            <div className="row g-4 align-items-start">
                                <div className="col-12 col-lg-9 technician-content">
                            <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
                                <div>
                                    <div className="small text-primary fw-bold">SECUREVIEW TECHNICIAN</div>
                                    <h1 className="fw-bold text-primary mb-0">{pageTitle}</h1>
                                    <div className="small text-muted mt-1">{pageDescription}</div>
                                </div>
                                <span className="badge bg-light text-primary border px-3 py-2 flex-shrink-0">Live data</span>
                            </div>
                        {props.flash?.success && (
                            <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="status"><i className="bi bi-check-circle-fill" /><span>{props.flash.success}</span></div>
                        )}
                            {activePage === "dashboard" && (
                                <>
                                    <div className="row g-3 mb-4">
                                        <div className="col-6 col-xl-3">
                                            <div className="workspace-stat bg-white border rounded-4 p-3 p-lg-4 h-100">
                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                    <span className="small text-secondary fw-semibold">MY ACTIVE JOBS</span>
                                                    <span className="stat-icon bg-primary-subtle text-primary"><i className="bi bi-clipboard2-check" /></span>
                                                </div>
                                                <div className="d-flex align-items-end justify-content-between gap-2">
                                                    <div className="display-6 fw-bold text-dark lh-1">{activeJobs.length}</div>
                                                    <span className="small text-muted">Confirmed + ongoing</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-xl-3">
                                            <div className="workspace-stat bg-white border rounded-4 p-3 p-lg-4 h-100">
                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                    <span className="small text-secondary fw-semibold">IN PROGRESS</span>
                                                    <span className="stat-icon bg-info-subtle text-info-emphasis"><i className="bi bi-tools" /></span>
                                                </div>
                                                <div className="d-flex align-items-end justify-content-between gap-2">
                                                    <div className="display-6 fw-bold text-dark lh-1">{inProgressJobs.length}</div>
                                                    <span className="small text-muted">Currently underway</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-xl-3">
                                            <div className="workspace-stat bg-white border rounded-4 p-3 p-lg-4 h-100">
                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                    <span className="small text-secondary fw-semibold">AVAILABLE JOBS</span>
                                                    <span className="stat-icon bg-success-subtle text-success"><i className="bi bi-people" /></span>
                                                </div>
                                                <div className="d-flex align-items-end justify-content-between gap-2">
                                                    <div className="display-6 fw-bold text-dark lh-1">{openJobs.length}</div>
                                                    <span className="small text-muted">Open team opportunities</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-xl-3">
                                            <div className="workspace-stat bg-white border rounded-4 p-3 p-lg-4 h-100">
                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                    <span className="small text-secondary fw-semibold">PRODUCTS TRACKED</span>
                                                    <span className="stat-icon bg-warning-subtle text-warning-emphasis"><i className="bi bi-box-seam" /></span>
                                                </div>
                                                <div className="d-flex align-items-end justify-content-between gap-2">
                                                    <div className="display-6 fw-bold text-dark lh-1">{inventory.length}</div>
                                                    <span className="small text-muted">Stock records</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <section className="workspace-section p-3 p-lg-4 mb-4">
                                        <div className="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3 mb-3">
                                            <div>
                                                <div className="small text-primary fw-bold text-uppercase mb-1">Your workload</div>
                                                <h2 className="h4 fw-bold mb-1">My Active Services</h2>
                                                <p className="text-secondary mb-0">Confirmed and ongoing jobs that need your attention.</p>
                                            </div>
                                            <Link href="/technician/services" className="btn btn-sm btn-outline-primary fw-semibold text-nowrap">
                                                View my services <i className="bi bi-arrow-right ms-1" />
                                            </Link>
                                        </div>

                                        {activeJobs.length > 0 ? (
                                            <div className="row g-3">
                                                {activeJobs.slice(0, 3).map((job) => (
                                                    <div className="col-12 col-xxl-6" key={job.id}>
                                                        <JobCard job={job} products={inventory} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="technician-empty-state border rounded-4 p-4 p-lg-5 text-center">
                                                <span className="stat-icon bg-primary-subtle text-primary mx-auto mb-3"><i className="bi bi-clipboard-check" /></span>
                                                <h3 className="h5 fw-bold mb-2">No active services assigned yet</h3>
                                                <p className="text-secondary mb-3 mx-auto" style={{ maxWidth: 540 }}>
                                                    When you're assigned to a confirmed service, its schedule, customer details, and next action will appear here. You can check available team jobs in the meantime.
                                                </p>
                                                <Link href="/technician/available-jobs" className="btn btn-primary fw-semibold">
                                                    <i className="bi bi-search me-2" />Browse available jobs
                                                </Link>
                                            </div>
                                        )}
                                    </section>

                                    <section className="workspace-section p-3 p-lg-4 mb-4">
                                        <div className="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3 mb-3">
                                            <div>
                                                <div className="small text-success fw-bold text-uppercase mb-1">Team opportunities</div>
                                                <h2 className="h4 fw-bold mb-1">Available Jobs</h2>
                                                <p className="text-secondary mb-0">Join a service when your schedule is free and the team has room.</p>
                                            </div>
                                            <Link href="/technician/available-jobs" className="btn btn-sm btn-outline-primary fw-semibold text-nowrap">
                                                View all jobs <i className="bi bi-arrow-right ms-1" />
                                            </Link>
                                        </div>

                                        {openJobs.length > 0 ? (
                                            <>
                                                <div className="row g-3">
                                                    {openJobs.slice(0, 3).map((job) => (
                                                        <div className="col-12 col-xxl-6" key={job.id}>
                                                            <JobCard job={job} open products={inventory} />
                                                        </div>
                                                    ))}
                                                </div>
                                                {openJobs.length > 3 && (
                                                    <div className="small text-secondary mt-3">
                                                        Showing 3 of {openJobs.length} available jobs. Open Available Jobs to see the rest.
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="technician-empty-state border rounded-4 p-4 text-center">
                                                <i className="bi bi-check2-circle fs-3 text-success d-block mb-2" />
                                                <div className="fw-semibold mb-1">No open team jobs right now</div>
                                                <p className="text-secondary small mb-0">New opportunities will appear here when a service has room for another technician.</p>
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}
                            {activePage === "services" && (
                                                <section className="workspace-section p-3 p-lg-4 p-xl-5 mb-4" id="my-jobs">
                                                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
                                                        <div>
                                                            <div className="small text-primary fw-bold text-uppercase mb-1" style={{ letterSpacing: ".08em" }}>Your workload</div>
                                                            <h2 className="h3 fw-bold mb-1">My Service Jobs</h2>
                                                            <p className="text-secondary mb-0">Review job details, navigate to the service location, and update service progress.</p>
                                                        </div>
                                                        <div className="d-flex flex-wrap gap-2">
                                                            {[
                                                                { key: "active", label: "Active", count: activeJobs.length },
                                                                { key: "pending", label: "Awaiting review", count: jobs.filter((job) => job.status === "pending").length },
                                                                { key: "confirmed", label: "Confirmed", count: jobs.filter((job) => job.status === "confirmed").length },
                                                                { key: "in_progress", label: "In progress", count: inProgressJobs.length },
                                                                { key: "completed", label: "Completed", count: completedJobs.length },
                                                                { key: "all", label: "All jobs", count: jobs.length },
                                                            ].map((filter) => (
                                                                <button
                                                                    key={filter.key}
                                                                    type="button"
                                                                    className={"workspace-filter btn btn-sm rounded-pill px-3 " + (jobFilter === filter.key ? "active" : "")}
                                                                    onClick={() => setJobFilter(filter.key)}
                                                                >
                                                                    {filter.label} <span className={"badge rounded-pill ms-1 " + (jobFilter === filter.key ? "text-bg-light text-primary" : "bg-light text-secondary")}>{filter.count}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                            
                                                    {filteredJobs.length ? (
                                                        <div className="row g-3">
                                                            {filteredJobs.map((job) => (
                                                                <div className="col-md-6 col-xxl-4" key={job.id}>
                                                                    <JobCard job={job} products={inventory} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center bg-light border rounded-4 p-4 p-lg-5">
                                                            <div className="mx-auto d-flex align-items-center justify-content-center rounded-circle bg-white border text-primary mb-3" style={{ width: 58, height: 58 }}>
                                                                <i className="bi bi-clipboard2-check fs-4" />
                                                            </div>
                                                            <h3 className="h5 fw-bold mb-2">
                                                                {jobFilter === "active" ? "No active jobs assigned" : jobFilter === "pending" ? "No services awaiting review" : jobFilter === "completed" ? "No completed services yet" : "No jobs in this view"}
                                                            </h3>
                                                            <p className="text-secondary mb-3">
                                                                {jobFilter === "active"
                                                                    ? "When you're assigned to or join a service, it will appear here. Jobs awaiting admin confirmation will be labelled clearly."
                                                                    : "Try another filter or check Available Jobs."}
                                                            </p>
                                                            <Link href="/technician/available-jobs" className="btn btn-outline-primary fw-semibold">
                                                                <i className="bi bi-search me-2" />Browse available jobs</Link>
                                                        </div>
                                                    )}
                                                </section>
                        )}
                            {activePage === "available-jobs" && (
                                                <section className="workspace-section p-3 p-lg-4 p-xl-5 mb-4" id="available-jobs">
                                                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
                                                        <div>
                                                            <div className="small text-success fw-bold text-uppercase mb-1" style={{ letterSpacing: ".08em" }}>Team opportunities</div>
                                                            <h2 className="h3 fw-bold mb-1">Available Jobs</h2>
                                                            <p className="text-secondary mb-0">Join a confirmed service when it fits your schedule and the team has room.</p>
                                                        </div>
                                                        <div className="input-group" style={{ maxWidth: 360 }}>
                                                            <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
                                                            <input
                                                                type="search"
                                                                className="form-control"
                                                                value={availableJobSearch}
                                                                onChange={(event) => setAvailableJobSearch(event.target.value)}
                                                                placeholder="Search service, location, job ID..."
                                                                aria-label="Search available jobs"
                                                            />
                                                            {availableJobSearch && (
                                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setAvailableJobSearch("")} aria-label="Clear job search">
                                                                    <i className="bi bi-x-lg" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                            
                                                    {filteredOpenJobs.length ? (
                                                        <div className="row g-3">
                                                            {filteredOpenJobs.map((job) => (
                                                                <div className="col-md-6 col-xxl-4" key={job.id}>
                                                                    <JobCard job={job} open products={inventory} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center bg-light border rounded-4 p-4 p-lg-5">
                                                            <div className="mx-auto d-flex align-items-center justify-content-center rounded-circle bg-white border text-success mb-3" style={{ width: 58, height: 58 }}>
                                                                <i className="bi bi-people fs-4" />
                                                            </div>
                                                            <h3 className="h5 fw-bold mb-2">{openJobs.length ? "No jobs match your search" : "No available jobs right now"}</h3>
                                                            <p className="text-secondary mb-0">{openJobs.length ? "Try another service name, location, or service number." : "New confirmed services with open team spots will appear here automatically."}</p>
                                                        </div>
                                                    )}
                                                </section>
                        )}
                            {activePage === "post-service-records" && (
                                                <section className="workspace-section p-3 p-lg-4 p-xl-5 mb-4" id="service-records">
                                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                                                        <div>
                                                            <div className="small text-primary fw-bold text-uppercase mb-1" style={{ letterSpacing: ".08em" }}>Work history</div>
                                                            <h2 className="h3 fw-bold mb-1">Post-Service Records</h2>
                                                            <p className="text-secondary mb-0">Review completed work, parts pulled from stock, parts removed from the customer site, and recorded service income.</p>
                                                        </div>
                                                        <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">{completedJobs.filter((job) => job.service_record).length} saved records</span>
                                                    </div>
                                                    {completedJobs.some((job) => job.service_record) ? (
                                                        <div className="row g-3">
                                                            {completedJobs.filter((job) => job.service_record).map((job) => (
                                                                <div className="col-md-6 col-xxl-4" key={job.id}>
                                                                    <JobCard job={job} products={inventory} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center bg-light border rounded-4 p-4 p-lg-5">
                                                            <div className="mx-auto d-flex align-items-center justify-content-center rounded-circle bg-white border text-primary mb-3" style={{ width: 58, height: 58 }}>
                                                                <i className="bi bi-journal-check fs-4" />
                                                            </div>
                                                            <h3 className="h5 fw-bold mb-2">No Post-Service Records yet</h3>
                                                            <p className="text-secondary mb-0">When you complete a job, submit its Post-Service Record to save the work summary, parts, and service income here. Older completed jobs may not have a record.</p>
                                                        </div>
                                                    )}
                                                </section>
                        )}
                            {activePage === "service-history" && (
                            <section className="workspace-section p-3 p-lg-4 mb-3">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                                    <div>
                                        <div className="small text-primary fw-bold text-uppercase mb-1">Completed work</div>
                                        <h2 className="h4 fw-bold mb-1">Service History</h2>
                                        <p className="text-secondary mb-0">Completed services assigned to you. Services with a Post-Service Record include their recorded work and income details.</p>
                                    </div>
                                    <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">{serviceHistoryTotal} completed</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light"><tr><th className="ps-3">Service</th><th>Customer</th><th>Scheduled for</th><th>Priority</th><th>Post-Service Record</th></tr></thead>
                                        <tbody>
                                            {serviceHistoryRows.length ? serviceHistoryRows.map((service) => (
                                                <tr key={service.id}>
                                                    <td className="ps-3"><div className="fw-bold">{service.service_type}</div><div className="small text-muted">{service.item_name || "General service"}</div><div className="small text-muted">{service.inquiry_number}</div></td>
                                                    <td><div className="fw-semibold">{service.customer_name || "—"}</div><div className="small text-muted">{service.city || "—"}</div></td>
                                                    <td><div className="fw-semibold">{service.preferred_date || "—"}</div><div className="small text-muted">{service.preferred_time || "—"}</div></td>
                                                    <td><span className={"badge rounded-pill text-capitalize " + (service.urgency === "emergency" ? "text-bg-danger" : service.urgency === "urgent" ? "text-bg-warning" : "text-bg-secondary")}>{service.urgency || "normal"}</span></td>
                                                    <td>{service.service_record ? <div><div className="fw-semibold text-success">Recorded</div><div className="small text-muted">₱{Number(service.service_record.total_income ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div> : <span className="small text-muted">No record saved</span>}</td>
                                                </tr>
                                            )) : <tr><td colSpan="5" className="text-center py-5"><i className="bi bi-clock-history fs-3 text-muted d-block mb-2" /><div className="fw-semibold">No completed services in your history yet</div><div className="small text-muted">Completed services assigned to you will appear here.</div></td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                {serviceHistoryTotal > 0 && (
                                    <AdminPagination pagination={serviceHistory} label="completed services" insideCard />
                                )}
                            </section>
                        )}
                            {activePage === "products" && (
                                                <section className="workspace-section p-3 p-lg-4 p-xl-5" id="inventory">
                                                    <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-end gap-3 mb-4">
                                                        <div>
                                                            <div className="small text-warning-emphasis fw-bold text-uppercase mb-1" style={{ letterSpacing: ".08em" }}>Product stock</div>
                                                            <h2 className="h3 fw-bold mb-1">Products</h2>
                                                            <p className="text-secondary mb-0">Review the product catalog and current stock. Record stock changes with a reason so the inventory history stays accurate.</p>
                                                        </div>
                                                        <div className="d-flex flex-column flex-sm-row gap-2" style={{ width: "100%", maxWidth: "520px", minWidth: 0, flex: "1 1 300px" }}>
                                                            <div className="input-group">
                                                                <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
                                                                <input
                                                                    className="form-control"
                                                                    type="search"
                                                                    value={inventorySearch}
                                                                    onChange={(event) => setInventorySearch(event.target.value)}
                                                                    placeholder="Search inventory..."
                                                                    aria-label="Search inventory"
                                                                />
                                                            </div>
                                                            <select className="form-select" value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value)} aria-label="Filter inventory by stock level" style={{ minWidth: 145 }}>
                                                                <option value="all">All stock</option>
                                                                <option value="low">Low stock (1–5)</option>
                                                                <option value="out">Out of stock</option>
                                                            </select>
                                                        </div>
                                                    </div>
                            
                            
                                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                                        <span className="badge rounded-pill bg-light text-secondary border px-3 py-2">{inventory.length} products</span>
                                                        <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2">{inventory.filter((product) => Number(product.stock_quantity) > 0 && Number(product.stock_quantity) <= 5).length} low stock</span>
                                                        <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">{inventory.filter((product) => Number(product.stock_quantity) <= 0).length} out of stock</span>
                                                    </div>
                            
                                                    <div className="border rounded-4 overflow-hidden">
                                                        <div className="table-responsive">
                                                            <table className="table workspace-table align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th className="ps-3">Product</th>
                                                                        <th>Brand</th>
                                                                        <th>Category</th>
                                                                        <th>Warranty</th>
                                                                        <th>Price</th>
                                                                        <th>Current stock</th>
                                                                        <th style={{ minWidth: 150 }}>Adjustment (+ / −)</th>
                                                                        <th style={{ minWidth: 230 }}>Reason for change</th>
                                                                        <th className="text-end pe-3">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {filteredInventory.map((product) => {
                                                                        const image = productImageSource(product);
                                                                        return (
                                                                            <tr key={product.id}>
                                                                                <td className="ps-3" style={{ minWidth: 260 }}>
                                                                                    <div className="d-flex align-items-center gap-3">
                                                                                        {image ? (
                                                                                            <img src={image} alt="" loading="lazy" className="rounded-3 border bg-white flex-shrink-0" style={{ width: 56, height: 56, objectFit: "contain", padding: 3 }} />
                                                                                        ) : (
                                                                                            <span className="d-flex align-items-center justify-content-center rounded-3 border bg-light text-secondary flex-shrink-0" style={{ width: 56, height: 56 }}>
                                                                                                <i className="bi bi-box-seam fs-5" />
                                                                                            </span>
                                                                                        )}
                                                                                        <div>
                                                                                            <div className="fw-semibold">{product.name}</div>
                                                                                            <div className="small text-muted">SKU · {String(product.id).padStart(7, "0")}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td><span className="badge bg-light text-secondary border">{product.brand || "—"}</span></td>
                                                                                <td><span className="badge bg-light text-secondary border">{product.category || "Uncategorized"}</span></td>
                                                                                <td><span className="badge bg-light text-secondary border">{product.warranty || "Not specified"}</span></td>
                                                                                <td className="text-nowrap">₱{Number(product.price ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                                <td>
                                                                                    <span className={"badge rounded-pill px-3 py-2 " + stockClass(product.stock_quantity)}>{product.stock_quantity} units</span>
                                                                                </td>
                                                                                <td style={{ minWidth: 150 }}>
                                                                                    <input
                                                                                        className={"form-control " + (stockErrors[product.id]?.quantity_change ? "is-invalid" : "")}
                                                                                        type="number"
                                                                                        step="1"
                                                                                        value={stockChanges[product.id]?.change ?? ""}
                                                                                        placeholder="+5 or -2"
                                                                                        aria-label={"Stock adjustment for " + product.name}
                                                                                        onChange={(event) => updateStockField(product.id, "change", event.target.value)}
                                                                                    />
                                                                                </td>
                                                                                <td style={{ minWidth: 230 }}>
                                                                                    <input
                                                                                        className={"form-control " + (stockErrors[product.id]?.reason ? "is-invalid" : "")}
                                                                                        value={stockChanges[product.id]?.reason ?? ""}
                                                                                        placeholder="e.g. Used for installation"
                                                                                        aria-label={"Reason for stock adjustment for " + product.name}
                                                                                        onChange={(event) => updateStockField(product.id, "reason", event.target.value)}
                                                                                    />
                                                                                    {stockErrors[product.id]?.reason && <div className="small text-danger mt-1">{stockErrors[product.id].reason}</div>}
                                                                                    {stockErrors[product.id]?.quantity_change && <div className="small text-danger mt-1">{stockErrors[product.id].quantity_change}</div>}
                                                                                </td>
                                                                                <td className="text-end pe-3">
                                                                                    <button type="button" className="btn btn-primary fw-semibold text-nowrap" disabled={savingProduct === product.id} onClick={(event) => adjustStock(event, product)}>
                                                                                        {savingProduct === product.id ? <><span className="spinner-border spinner-border-sm me-2" />Saving</> : <><i className="bi bi-arrow-left-right me-2" />Adjust stock</>}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                    {!filteredInventory.length && (
                                                                        <tr><td colSpan="9" className="text-center text-secondary py-5">
                                                                            <i className="bi bi-search fs-4 d-block mb-2" />
                                                                            {inventory.length ? "No products match these filters." : "No products in inventory."}
                                                                        </td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    <p className="small text-muted mt-3 mb-0">
                                                        <i className="bi bi-shield-check me-1" />
                                                        Stock cannot be reduced below zero. All successful adjustments are recorded for audit and low-stock monitoring.
                                                    </p>
                                                </section>
                        )}
                            {activePage === "schedule" && (
                            <section className="workspace-section p-3 p-lg-4 mb-3">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                                    <div>
                                        <div className="small text-primary fw-bold text-uppercase mb-1">Your appointments</div>
                                        <h2 className="h4 fw-bold mb-1">My Schedule</h2>
                                        <p className="text-secondary mb-0">Your confirmed and ongoing services are listed here. The calendar and appointment shortcuts stay on the right.</p>
                                    </div>
                                    <span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">{scheduleData.length} upcoming shown</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr><th className="ps-3">Service</th><th>Date and time</th><th>Priority</th><th>Status</th><th>Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {scheduleData.length ? scheduleData.map((schedule) => (
                                                <tr key={schedule.id}>
                                                    <td className="ps-3">
                                                        <div className="fw-semibold">{schedule.title}</div>
                                                        <div className="small text-muted">{schedule.inquiry_number}</div>
                                                        <div className="small text-muted">{schedule.customer_name || ""}</div>
                                                    </td>
                                                    <td><div className="fw-semibold">{schedule.date}</div><div className="small text-muted">{schedule.time || "Time not set"}</div></td>
                                                    <td><span className={"badge rounded-pill text-capitalize " + priorityClass(schedule.urgency)}>{schedule.urgency || "normal"}</span></td>
                                                    <td><span className={"badge rounded-pill text-capitalize " + statusClass(schedule.status)}>{formatStatus(schedule.status)}</span></td>
                                                    <td><Link href="/technician/services#my-jobs" className="btn btn-sm btn-outline-primary text-nowrap">Open service</Link></td>
                                                </tr>
                                            )) : <tr><td colSpan="5" className="text-center py-5"><i className="bi bi-calendar-check fs-3 d-block text-muted mb-2" /><div className="fw-semibold">No upcoming appointments</div><div className="small text-muted">New assigned appointments will appear here.</div></td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                                </div>
                                <aside className="col-12 col-lg-3 technician-right-sidebar">
                                    <Calendar
                                        title="My Schedule"
                                        subtitle="Your assigned appointments and service dates."
                                        schedules={scheduleData}
                                        upcomingCount={upcomingScheduleCount}
                                        fullyBookedDates={calendarAvailability.fullyBookedDates ?? []}
                                        partiallyBlockedDates={calendarAvailability.partiallyBlockedDates ?? []}
                                        viewAllHref="/technician/schedule"
                                        itemHrefPrefix="/technician/services#my-jobs"
                                    />

                                    <div className="mt-4">
                                        <AnnouncementFeed
                                            announcements={recentAnnouncements}
                                            manageHref="/notifications"
                                            manageLabel="View notifications"
                                            emptyMessage="No admin announcements have been published yet."
                                            emptyLinkLabel="View notifications"
                                        />
                                    </div>

                                    <section className="card border rounded-3 mt-4">
                                        <div className="card-body p-3 p-lg-4">
                                            <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                                                <div>
                                                    <h5 className="fw-bold mb-1">Recent Notifications</h5>
                                                    <p className="small text-muted mb-0">Updates for your technician account.</p>
                                                </div>
                                                <span className="badge bg-primary-subtle text-primary rounded-pill">{unreadNotificationCount} unread</span>
                                            </div>

                                            {recentNotifications.length > 0 ? (
                                                <>
                                                    <div className="d-flex flex-column gap-2">
                                                        {visibleNotifications.map((notification) => (
                                                            <Link
                                                                key={notification.id}
                                                                href="/notifications"
                                                                className="d-block border rounded-3 p-3 text-decoration-none text-reset"
                                                            >
                                                                <div className="d-flex align-items-start gap-2">
                                                                    <span className={"d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 " + (notification.read ? "bg-light text-secondary" : "bg-primary-subtle text-primary")} style={{ width: 34, height: 34 }}>
                                                                        <i className={"bi " + (notification.type === "announcement" ? "bi-megaphone" : "bi-bell")} />
                                                                    </span>
                                                                    <div className="min-w-0 flex-grow-1">
                                                                        <div className="fw-semibold">{notification.title}</div>
                                                                        <div className="small text-muted mt-1" style={{ overflowWrap: "anywhere" }}>{notification.message}</div>
                                                                        <div className="small text-muted mt-2">{notification.created_at}</div>
                                                                    </div>
                                                                    {!notification.read && <span className="badge bg-primary rounded-pill">New</span>}
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
                                                        <small className="text-muted">
                                                            Showing {(safeNotificationPage - 1) * notificationPageSize + 1}–{Math.min(safeNotificationPage * notificationPageSize, recentNotifications.length)} of {recentNotifications.length}
                                                        </small>
                                                        <div className="d-flex gap-1">
                                                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRecentNotificationsPage((page) => Math.max(1, page - 1))} disabled={safeNotificationPage <= 1} aria-label="Previous notifications page">
                                                                <i className="bi bi-chevron-left" />
                                                            </button>
                                                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRecentNotificationsPage((page) => Math.min(notificationPageCount, page + 1))} disabled={safeNotificationPage >= notificationPageCount} aria-label="Next notifications page">
                                                                <i className="bi bi-chevron-right" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center border rounded-3 bg-light p-4">
                                                    <i className="bi bi-bell fs-4 text-muted d-block mb-2" />
                                                    <p className="small text-muted mb-0">No recent notifications.</p>
                                                </div>
                                            )}
                                            <div className="text-end mt-3">
                                                <Link href="/notifications" className="small fw-semibold text-decoration-none">Open notifications</Link>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="mt-4">
                                        <Announcements
                                            title="Recent Services"
                                            announcements={recentServices}
                                            unreadNotificationCount={unreadNotificationCount}
                                            viewAllHref="/technician/services"
                                            serviceHref={() => "/technician/services#my-jobs"}
                                            description="Recent services assigned to you and their current status."
                                            emptyMessage="No recent services are assigned to you yet."
                                            emptyLinkLabel="Open My Services"
                                            alertLabel="Unread technician notifications"
                                        />
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
