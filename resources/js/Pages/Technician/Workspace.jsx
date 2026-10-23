import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Calendar from "../../Components/Admin/Calendar";
import PanelPagination from "../../Components/Admin/PanelPagination";
import { Link, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { googleMapsDirectionsUrl } from "../../Components/GoogleMaps/ServiceLocation";

function statusClass(status) {
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "in_progress") return "bg-primary-subtle text-primary";
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

function JobCard({ job, open = false }) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState("");
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(job.preferred_date_value || "");
    const [scheduleTime, setScheduleTime] = useState(job.preferred_time || "08:00 AM - 11:00 AM");
    const [scheduleError, setScheduleError] = useState("");
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
        setWorking(true);
        setError("");
        router.patch("/technician/jobs/" + job.id + "/status", { status }, {
            preserveScroll: true,
            onError: (errors) => setError(errors.status ?? "Unable to update job status."),
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
                {open && <span className="badge rounded-pill text-bg-success">Available to join</span>}
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
            </div>

            {job.technicians?.length > 0 && (
                <div className="rounded-3 bg-light p-3 mb-3">
                    <div className="small text-muted fw-semibold mb-2">ASSIGNED TEAM</div>
                    <div className="d-flex flex-wrap gap-2">
                        {job.technicians.map((technician) => (
                            <span key={technician.id} className="badge rounded-pill text-bg-light border text-dark">
                                {technician.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {!open && job.customer_name && (
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

            {open ? (
                <button className="btn btn-primary w-100 fw-bold" disabled={working} onClick={claim}>
                    {working ? "JOINING..." : "JOIN THIS SERVICE"}
                </button>
            ) : job.status === "confirmed" ? (
                <button className="btn btn-primary w-100 fw-bold" disabled={working} onClick={() => updateStatus("in_progress")}>
                    {working ? "UPDATING..." : "START JOB"}
                </button>
            ) : job.status === "in_progress" ? (
                <button className="btn btn-success w-100 fw-bold" disabled={working} onClick={() => updateStatus("completed")}>
                    {working ? "UPDATING..." : "MARK JOB COMPLETED"}
                </button>
            ) : (
                <div className="small text-success fw-semibold">This job is completed.</div>
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

export default function TechnicianWorkspace({ jobs = [], openJobs = [], inventory = [], recentNotifications = [] }) {
    const { props } = usePage();
    const [stockChanges, setStockChanges] = useState({});
    const [stockErrors, setStockErrors] = useState({});
    const [savingProduct, setSavingProduct] = useState(null);
    const [jobFilter, setJobFilter] = useState("active");
    const [availableJobSearch, setAvailableJobSearch] = useState("");
    const [inventorySearch, setInventorySearch] = useState("");
    const [inventoryFilter, setInventoryFilter] = useState("all");
    const [notificationPage, setNotificationPage] = useState(1);
    const notificationPageSize = 3;
    const notificationTotalPages = Math.ceil(recentNotifications.length / notificationPageSize);
    const safeNotificationPage = Math.min(notificationPage, Math.max(1, notificationTotalPages));
    const pageNotifications = recentNotifications.slice(
        (safeNotificationPage - 1) * notificationPageSize,
        safeNotificationPage * notificationPageSize
    );

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
        () => jobs.filter((job) => ["confirmed", "in_progress"].includes(job.status)),
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
            const matchesSearch = !query || [product.name, product.category, String(product.id)]
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

    return (
        <div className="technician-workspace">
            <Navbar />
            <style>{`
                .technician-workspace { background: #f4f7fb; }
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
                @media (prefers-reduced-motion: reduce) {
                    .technician-workspace .workspace-stat, .technician-workspace .technician-job-card { transition: none; }
                }
            `}</style>

            <main style={{ minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                <div className="container-fluid px-3 px-xl-4 py-4 py-xl-5" style={{ maxWidth: "1680px", margin: "0 auto" }}>
                    <section className="workspace-hero p-3 p-lg-4 p-xl-5 mb-4">
                        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3">
                            <div className="d-flex align-items-start gap-3">
                                <div className="d-none d-sm-flex align-items-center justify-content-center rounded-4 bg-primary text-white flex-shrink-0" style={{ width: 58, height: 58, boxShadow: "0 8px 18px rgba(23,105,237,.2)" }}>
                                    <i className="bi bi-tools fs-3" />
                                </div>
                                <div>
                                    <div className="small text-primary fw-bold text-uppercase mb-1" style={{ letterSpacing: ".09em" }}>
                                        SecureView · Field Operations
                                    </div>
                                    <h1 className="fw-bold mb-2" style={{ fontSize: "clamp(1.65rem, 2.4vw, 2.35rem)", letterSpacing: "-.035em" }}>
                                        Technician Workspace
                                    </h1>
                                    <p className="text-secondary mb-0" style={{ maxWidth: 720 }}>
                                        Manage your assigned services, join available team jobs, and keep product inventory accurate.
                                    </p>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
                                    <i className="bi bi-circle-fill me-2" style={{ fontSize: ".45rem" }} />
                                    Field operations
                                </span>
                                <Link href="/notifications" className="btn btn-primary fw-semibold px-3 py-2">
                                    <i className="bi bi-bell me-2" />
                                    Notifications
                                    {Number(props.notificationCount ?? 0) > 0 && (
                                        <span className="badge text-bg-light text-primary ms-2">{props.notificationCount > 99 ? "99+" : props.notificationCount}</span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </section>

                    {props.flash?.success && (
                        <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="status">
                            <i className="bi bi-check-circle-fill" />
                            <span>{props.flash.success}</span>
                        </div>
                    )}

                    <div className="row g-4 align-items-start">
                        <div className="col-lg-9">
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-xl-3">
                            <div className="workspace-stat bg-white border rounded-4 p-3 p-lg-4 h-100">
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                    <span className="small text-secondary fw-semibold">MY ACTIVE JOBS</span>
                                    <span className="stat-icon bg-primary-subtle text-primary"><i className="bi bi-clipboard2-check" /></span>
                                </div>
                                <div className="d-flex align-items-end justify-content-between">
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
                                <div className="d-flex align-items-end justify-content-between">
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
                                <div className="d-flex align-items-end justify-content-between">
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
                                <div className="d-flex align-items-end justify-content-between">
                                    <div className="display-6 fw-bold text-dark lh-1">{inventory.length}</div>
                                    <span className="small text-muted">Stock records</span>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                        <JobCard job={job} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center bg-light border rounded-4 p-4 p-lg-5">
                                <div className="mx-auto d-flex align-items-center justify-content-center rounded-circle bg-white border text-primary mb-3" style={{ width: 58, height: 58 }}>
                                    <i className="bi bi-clipboard2-check fs-4" />
                                </div>
                                <h3 className="h5 fw-bold mb-2">
                                    {jobFilter === "active" ? "No active jobs assigned" : jobFilter === "completed" ? "No completed services yet" : "No jobs in this view"}
                                </h3>
                                <p className="text-secondary mb-3">
                                    {jobFilter === "active"
                                        ? "When you're assigned to a service, it will appear here. You can also join an available job below."
                                        : "Try another filter or check Available Jobs."}
                                </p>
                                <a href="#available-jobs" className="btn btn-outline-primary fw-semibold">
                                    <i className="bi bi-search me-2" />Browse available jobs
                                </a>
                            </div>
                        )}
                    </section>

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
                                        <JobCard job={job} open />
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

                    <section className="workspace-section p-3 p-lg-4 p-xl-5" id="inventory">
                        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-end gap-3 mb-4">
                            <div>
                                <div className="small text-warning-emphasis fw-bold text-uppercase mb-1" style={{ letterSpacing: ".08em" }}>Stock control</div>
                                <h2 className="h3 fw-bold mb-1">Inventory</h2>
                                <p className="text-secondary mb-0">Record every stock adjustment with a reason. Each update creates an audit record.</p>
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
                                            <th>Category</th>
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
                                                                <img src={image} alt="" loading="lazy" className="rounded-3 border bg-white flex-shrink-0" style={{ width: 46, height: 46, objectFit: "cover" }} />
                                                            ) : (
                                                                <span className="d-flex align-items-center justify-content-center rounded-3 border bg-light text-secondary flex-shrink-0" style={{ width: 46, height: 46 }}>
                                                                    <i className="bi bi-box-seam fs-5" />
                                                                </span>
                                                            )}
                                                            <div>
                                                                <div className="fw-semibold">{product.name}</div>
                                                                <div className="small text-muted">SKU · {String(product.id).padStart(7, "0")}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className="badge bg-light text-secondary border">{product.category || "Uncategorized"}</span></td>
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
                                            <tr><td colSpan="6" className="text-center text-secondary py-5">
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
                        </div>

                        <aside className="col-lg-3">
                            <div className="mb-4">
                                <Calendar
                                    title="My Schedule"
                                    subtitle="Your assigned appointments and service dates."
                                    schedules={upcomingTechnicianJobs}
                                    upcomingCount={activeJobs.length}
                                    viewAllHref="/technician/workspace#my-jobs"
                                    itemHrefPrefix="/technician/workspace#my-jobs"
                                />
                            </div>

                            <section className="card border rounded-3 mb-4">
                                <div className="card-body p-3 p-lg-4">
                                    <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                                        <div>
                                            <h5 className="fw-bold mb-1">Recent Notifications</h5>
                                            <p className="small text-muted mb-0">Updates about your jobs and team.</p>
                                        </div>
                                        <Link href="/notifications" className="btn btn-sm btn-outline-primary text-nowrap">View all</Link>
                                    </div>
                                    {recentNotifications.length ? (
                                        <>
                                        <div className="d-flex flex-column gap-2">
                                            {pageNotifications.map((notification) => (
                                                <article key={notification.id} className="border rounded-3 p-3">
                                                    <div className="d-flex align-items-start gap-2">
                                                        <span className={"d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 " + (notification.read ? "bg-light text-secondary" : "bg-primary-subtle text-primary")} style={{ width: 34, height: 34 }}>
                                                            <i className={"bi " + (notification.type === "announcement" ? "bi-megaphone" : "bi-bell")} />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="fw-bold small">{notification.title}</div>
                                                            <div className="small text-muted mt-1">{notification.created_at}</div>
                                                        </div>
                                                    </div>
                                                    <p className="small mb-0 mt-2 text-secondary">{notification.message}</p>
                                                </article>
                                            ))}
                                        </div>
                                        <PanelPagination
                                            page={safeNotificationPage}
                                            totalPages={notificationTotalPages}
                                            totalItems={recentNotifications.length}
                                            pageSize={notificationPageSize}
                                            onPageChange={setNotificationPage}
                                        />
                                        </>
                                    ) : (
                                        <div className="text-center rounded-3 bg-light p-4">
                                            <i className="bi bi-bell fs-4 text-muted d-block mb-2" />
                                            <p className="small text-muted mb-0">You're all caught up. New job updates and announcements will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="card border rounded-3">
                                <div className="card-body p-3 p-lg-4">
                                    <h5 className="fw-bold mb-1">Quick Links</h5>
                                    <p className="small text-muted mb-3">Jump to the tools you use most.</p>
                                    <div className="d-grid gap-2">
                                        <a href="#my-jobs" className="btn btn-outline-primary text-start"><i className="bi bi-clipboard2-check me-2" />My Service Jobs</a>
                                        <a href="#available-jobs" className="btn btn-outline-primary text-start"><i className="bi bi-people me-2" />Available Jobs</a>
                                        <a href="#inventory" className="btn btn-outline-primary text-start"><i className="bi bi-box-seam me-2" />Inventory</a>
                                        <Link href="/notifications" className="btn btn-outline-primary text-start"><i className="bi bi-bell me-2" />Notifications</Link>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
