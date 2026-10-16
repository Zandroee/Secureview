import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import StaffSidebar from "../../Components/Staff/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "in_progress") return "bg-primary-subtle text-primary";
    return "bg-info-subtle text-info-emphasis";
}

function JobCard({ job, canJoin = false }) {
    const [joining, setJoining] = useState(false);
    const { props } = usePage();

    const join = () => {
        setJoining(true);
        router.post("/staff/jobs/" + job.id + "/join", {}, {
            preserveScroll: true,
            onFinish: () => setJoining(false),
        });
    };

    return (
        <article className="bg-white border rounded-3 p-3 h-100" style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.04)" }}>
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                    <div className="small text-muted">{job.inquiry_number}</div>
                    <h3 className="h6 fw-bold mb-1">{job.service_type}</h3>
                    <div className="small text-muted">{job.item_name || "General service"}</div>
                </div>
                <span className={"badge rounded-pill text-capitalize " + statusClass(job.status)}>{job.status.replace("_", " ")}</span>
            </div>
            <div className="small mb-1"><i className="bi bi-calendar3 me-2 text-primary"></i>{job.preferred_date} · {job.preferred_time}</div>
            <div className="small mb-3"><i className="bi bi-geo-alt me-2 text-primary"></i>{job.city}</div>
            <div className="d-flex align-items-center justify-content-between gap-2 border-top pt-3">
                <div className="small text-muted">
                    {job.team_count} of {job.max_technicians} technicians
                    {job.technicians?.length > 0 && (
                        <div className="mt-1 text-dark">
                            {job.technicians.map((technician) => technician.name + (technician.is_lead ? " (Lead)" : "")).join(", ")}
                        </div>
                    )}
                </div>
                {canJoin ? (
                    <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={join} disabled={joining}>
                        {joining ? "JOINING..." : "JOIN JOB"}
                    </button>
                ) : (
                    <Link href={"/staff/jobs/" + job.id} className="btn btn-outline-primary btn-sm fw-bold">VIEW JOB</Link>
                )}
            </div>
        </article>
    );
}

export default function StaffJobs({ assignedJobs = [], openJobs = [] }) {
    const { props } = usePage();
    const assigned = assignedJobs.data ?? [];

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><StaffSidebar active="jobs" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">SECUREVIEW STAFF</div>
                            <h1 className="fw-bold mb-1">MY JOBS</h1>
                            <div className="small text-muted">View your assigned services, update job progress, or join a job that needs additional technicians.</div>
                        </div>

                        {props.errors?.job && <div className="alert alert-danger">{props.errors.job}</div>}
                        {props.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}

                        <section className="mb-5">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="h5 fw-bold mb-0">Assigned to me</h2>
                                <span className="badge text-bg-primary">{assignedJobs.total ?? assigned.length}</span>
                            </div>
                            {assigned.length === 0 ? (
                                <div className="bg-white border rounded-3 p-5 text-center text-muted">
                                    <i className="bi bi-clipboard-x fs-2 d-block mb-2"></i>
                                    You don't have any assigned jobs yet.
                                </div>
                            ) : (
                                <>
                                    <div className="row g-3">
                                        {assigned.map((job) => <div className="col-xl-6" key={job.id}><JobCard job={job} /></div>)}
                                    </div>
                                    <div className="bg-white border rounded-3 mt-3">
                                        <AdminPagination pagination={assignedJobs} label="jobs" insideCard />
                                    </div>
                                </>
                            )}
                        </section>

                        <section>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="h5 fw-bold mb-0">Jobs looking for more technicians</h2>
                                <span className="badge text-bg-secondary">{openJobs.length}</span>
                            </div>
                            {openJobs.length === 0 ? (
                                <div className="bg-white border rounded-3 p-4 text-center text-muted">
                                    No open team positions right now. Check back later.
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {openJobs.map((job) => <div className="col-xl-6" key={job.id}><JobCard job={job} canJoin /></div>)}
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
