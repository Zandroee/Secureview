import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import StaffSidebar from "../../Components/Staff/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router } from "@inertiajs/react";
import { useState } from "react";

function statusBadge(status) {
    if (status === "in_progress") return "bg-primary-subtle text-primary";
    if (status === "completed") return "bg-success-subtle text-success";
    return "bg-info-subtle text-info-emphasis";
}

function JobCard({ job, onStatus, actionMessage, actionError }) {
    return (
        <article className="bg-white border rounded-3 p-3 p-md-4 h-100">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                <div>
                    <div className="small text-muted">{job.inquiry_number}</div>
                    <h3 className="h5 fw-bold mb-1">{job.service_type}</h3>
                    <div className="text-muted small">{job.item_name || "General service"}</div>
                </div>
                <span className={"badge rounded-pill text-capitalize px-3 py-2 " + statusBadge(job.status)}>
                    {job.status.replace("_", " ")}
                </span>
            </div>
            <div className="row g-3 small mb-3">
                <div className="col-sm-6">
                    <div className="text-muted">DATE & TIME</div>
                    <div className="fw-semibold">{job.preferred_date}</div>
                    <div>{job.preferred_time}</div>
                </div>
                <div className="col-sm-6">
                    <div className="text-muted">LOCATION</div>
                    <div className="fw-semibold">{job.city}</div>
                    {job.street_address && <div>{job.street_address}</div>}
                </div>
            </div>
            {job.customer_name && (
                <div className="border-top pt-3 mb-3 small">
                    <div className="text-muted">CUSTOMER</div>
                    <div className="fw-semibold">{job.customer_name}</div>
                    <div>{job.customer_phone} · {job.customer_email}</div>
                </div>
            )}
            <div className="border-top pt-3 mb-3">
                <div className="small text-muted mb-2">ASSIGNED TEAM</div>
                {job.technicians?.length ? (
                    <div className="d-flex flex-wrap gap-2">
                        {job.technicians.map((technician) => (
                            <span key={technician.id} className="badge rounded-pill bg-light text-dark border">
                                {technician.name}{technician.is_lead ? " · Lead" : ""}
                            </span>
                        ))}
                    </div>
                ) : <span className="small text-muted">No team listed</span>}
            </div>
            {job.notes && (
                <div className="small mb-3">
                    <div className="text-muted">NOTES</div>
                    <p className="mb-0">{job.notes}</p>
                </div>
            )}
            {actionError && <div className="alert alert-danger py-2 small">{actionError}</div>}
            {actionMessage && <div className="alert alert-success py-2 small">{actionMessage}</div>}
            {job.status === "confirmed" && (
                <button type="button" className="btn btn-primary fw-bold w-100" onClick={() => onStatus(job, "in_progress")}>
                    <i className="bi bi-play-fill me-1" /> START JOB
                </button>
            )}
            {job.status === "in_progress" && (
                <button type="button" className="btn btn-success fw-bold w-100" onClick={() => onStatus(job, "completed")}>
                    <i className="bi bi-check2-circle me-1" /> MARK COMPLETED
                </button>
            )}
        </article>
    );
}

export default function StaffJobs({ jobs = {}, availableJobs = [], summary = {}, filters = {}, isAdmin = false }) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [actionError, setActionError] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const rows = jobs.data ?? [];

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/staff/jobs", { search, status }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const updateStatus = (job, nextStatus) => {
        setActionError("");
        setActionMessage("");
        router.patch("/staff/jobs/" + job.id + "/status", { status: nextStatus }, {
            preserveScroll: true,
            onSuccess: () => setActionMessage(job.inquiry_number + " updated to " + nextStatus.replace("_", " ") + "."),
            onError: (errors) => setActionError(Object.values(errors)[0] || "Unable to update this job."),
        });
    };

    const joinJob = (job) => {
        setActionError("");
        setActionMessage("");
        router.post("/staff/jobs/" + job.id + "/join", {}, {
            preserveScroll: true,
            onSuccess: () => setActionMessage("You have joined " + job.inquiry_number + "."),
            onError: (errors) => setActionError(Object.values(errors)[0] || "Unable to join this job."),
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><StaffSidebar active="jobs" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">SECUREVIEW STAFF</div>
                            <h1 className="fw-bold mb-1">{isAdmin ? "SERVICE JOBS" : "MY SERVICE JOBS"}</h1>
                            <div className="text-muted small">Review upcoming jobs, update progress, and see completed work.</div>
                        </div>

                        <div className="row g-3 mb-4">
                            {[
                                ["UPCOMING", summary.upcoming ?? 0, "text-info-emphasis"],
                                ["ONGOING", summary.ongoing ?? 0, "text-primary"],
                                ["COMPLETED", summary.completed ?? 0, "text-success"],
                                ...(!isAdmin ? [["OPEN FOR SUPPORT", summary.available ?? 0, "text-warning-emphasis"]] : []),
                            ].map(([label, value, color]) => (
                                <div key={label} className="col-6 col-xl-3">
                                    <div className="bg-white border rounded-3 p-3 h-100">
                                        <div className="small text-muted">{label}</div>
                                        <div className={"h4 fw-bold mb-0 " + color}>{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={applyFilters} className="bg-white border rounded-3 p-3 mb-4 row g-2 align-items-end">
                            <div className="col-md-6">
                                <label className="form-label small fw-semibold">SEARCH JOBS</label>
                                <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Inquiry number, service, or city" />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold">STATUS</label>
                                <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                                    <option value="">All jobs</option>
                                    <option value="confirmed">Upcoming</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="col-md-3 d-flex gap-2">
                                <button className="btn btn-primary fw-bold flex-fill" type="submit">FILTER</button>
                                <button className="btn btn-outline-secondary" type="button" onClick={() => { setSearch(""); setStatus(""); router.get("/staff/jobs", {}, { preserveScroll: true, replace: true }); }}>CLEAR</button>
                            </div>
                        </form>

                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h2 className="h4 fw-bold mb-0">Assigned jobs</h2>
                            <span className="small text-muted">{jobs.total ?? rows.length} jobs</span>
                        </div>

                        {rows.length ? (
                            <>
                                <div className="row g-3">
                                    {rows.map((job) => (
                                        <div key={job.id} className="col-12 col-xl-6">
                                            <JobCard job={job} onStatus={updateStatus} actionMessage={actionMessage} actionError={actionError} />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3"><AdminPagination pagination={jobs} label="jobs" insideCard /></div>
                            </>
                        ) : (
                            <div className="bg-white border rounded-3 p-5 text-center text-muted">No jobs match your filters.</div>
                        )}

                        {!isAdmin && (
                            <section className="mt-5">
                                <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
                                    <div>
                                        <h2 className="h4 fw-bold mb-1">Open for additional technicians</h2>
                                        <p className="small text-muted mb-0">Only jobs opened by the admin are listed here. Customer contact details appear after you join the job.</p>
                                    </div>
                                    <span className="small text-muted">{availableJobs.length} available</span>
                                </div>
                                {availableJobs.length ? (
                                    <div className="row g-3">
                                        {availableJobs.map((job) => (
                                            <div key={job.id} className="col-12 col-xl-6">
                                                <article className="bg-white border rounded-3 p-3 p-md-4 h-100">
                                                    <div className="small text-muted">{job.inquiry_number}</div>
                                                    <h3 className="h5 fw-bold mb-1">{job.service_type}</h3>
                                                    <p className="text-muted small mb-3">{job.item_name || "General service"} · {job.city}</p>
                                                    <div className="small mb-3">
                                                        <div><strong>{job.preferred_date}</strong> · {job.preferred_time}</div>
                                                        <div>Team size: {job.assigned_count}/{job.max_technicians}</div>
                                                        {job.technicians?.length > 0 && (
                                                            <div className="mt-2 text-muted">Current team: {job.technicians.map((tech) => tech.name + (tech.is_lead ? " (Lead)" : "")).join(", ")}</div>
                                                        )}
                                                    </div>
                                                    <button type="button" className="btn btn-outline-primary fw-bold" onClick={() => joinJob(job)}>
                                                        <i className="bi bi-person-plus me-1" /> JOIN THIS JOB
                                                    </button>
                                                </article>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="bg-white border rounded-3 p-4 text-muted">There are no jobs currently open for additional technicians.</div>}
                            </section>
                        )}
                        {(actionMessage || actionError) && <div className="mt-3 small">{actionMessage || actionError}</div>}
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
