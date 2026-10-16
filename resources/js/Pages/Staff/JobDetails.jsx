import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import StaffSidebar from "../../Components/Staff/Sidebar";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function StaffJobDetails({ job }) {
    const { props } = usePage();
    const [working, setWorking] = useState(false);

    const join = () => {
        setWorking(true);
        router.post("/staff/jobs/" + job.id + "/join", {}, {
            preserveScroll: true,
            onFinish: () => setWorking(false),
        });
    };

    const updateStatus = (status) => {
        setWorking(true);
        router.patch("/staff/jobs/" + job.id + "/status", { status }, {
            preserveScroll: true,
            onFinish: () => setWorking(false),
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><StaffSidebar active="jobs" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SERVICE JOB · {job.inquiry_number}</div>
                                <h1 className="h3 fw-bold mb-1">{job.service_type}</h1>
                                <div className="text-muted small">{job.preferred_date} · {job.preferred_time}</div>
                            </div>
                            <Link href="/staff/jobs" className="btn btn-outline-primary fw-bold">BACK TO MY JOBS</Link>
                        </div>

                        {props.errors?.job && <div className="alert alert-danger">{props.errors.job}</div>}
                        {props.errors?.status && <div className="alert alert-danger">{props.errors.status}</div>}
                        {props.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}

                        <div className="row g-3">
                            <div className="col-lg-8">
                                <section className="bg-white border rounded-3 p-4 mb-3">
                                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                        <div>
                                            <div className="small text-muted">REQUESTED SERVICE</div>
                                            <div className="fw-bold fs-5">{job.item_name || "General service"}</div>
                                            <div className="small text-muted mt-1">{job.city}</div>
                                        </div>
                                        <span className="badge text-capitalize bg-primary-subtle text-primary">{job.status.replace("_", " ")}</span>
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="small text-muted">DATE</div>
                                            <div className="fw-semibold">{job.preferred_date}</div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="small text-muted">TIME</div>
                                            <div className="fw-semibold">{job.preferred_time}</div>
                                        </div>
                                        {job.is_assigned && (
                                            <div className="col-12">
                                                <div className="small text-muted">SERVICE ADDRESS</div>
                                                <div className="fw-semibold">{job.street_address}, {job.city}</div>
                                            </div>
                                        )}
                                    </div>
                                    {job.is_assigned && job.notes && (
                                        <div className="mt-4">
                                            <div className="small text-muted">CUSTOMER NOTES</div>
                                            <div className="bg-light border rounded-3 p-3 mt-1">{job.notes}</div>
                                        </div>
                                    )}
                                </section>

                                {job.is_assigned && job.customer && (
                                    <section className="bg-white border rounded-3 p-4">
                                        <h2 className="h5 fw-bold mb-3">CUSTOMER CONTACT</h2>
                                        <div className="row g-3">
                                            <div className="col-md-6"><div className="small text-muted">NAME</div><div className="fw-semibold">{job.customer.name}</div></div>
                                            <div className="col-md-6"><div className="small text-muted">PHONE</div><div className="fw-semibold">{job.customer.phone}</div></div>
                                            <div className="col-12"><div className="small text-muted">EMAIL</div><div className="fw-semibold text-break">{job.customer.email}</div></div>
                                        </div>
                                    </section>
                                )}
                            </div>

                            <div className="col-lg-4">
                                <section className="bg-white border rounded-3 p-4 mb-3">
                                    <h2 className="h5 fw-bold mb-3">TECHNICIAN TEAM</h2>
                                    <div className="small text-muted mb-3">{job.team_count} of {job.max_technicians} team members</div>
                                    {job.technicians.map((technician) => (
                                        <div key={technician.id} className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom">
                                            <div className="fw-semibold small">{technician.name}</div>
                                            {technician.is_lead && <span className="badge text-bg-primary">Lead</span>}
                                        </div>
                                    ))}
                                    {job.can_join && (
                                        <button type="button" className="btn btn-primary fw-bold w-100 mt-3" onClick={join} disabled={working}>
                                            {working ? "JOINING..." : "JOIN THIS JOB"}
                                        </button>
                                    )}
                                </section>

                                {job.is_assigned && (
                                    <section className="bg-white border rounded-3 p-4">
                                        <h2 className="h5 fw-bold mb-3">JOB PROGRESS</h2>
                                        {job.status === "confirmed" && (
                                            <button type="button" className="btn btn-primary fw-bold w-100" onClick={() => updateStatus("in_progress")} disabled={working}>
                                                {working ? "UPDATING..." : "START JOB"}
                                            </button>
                                        )}
                                        {job.status === "in_progress" && (
                                            <button type="button" className="btn btn-success fw-bold w-100" onClick={() => updateStatus("completed")} disabled={working}>
                                                {working ? "UPDATING..." : "MARK AS COMPLETED"}
                                            </button>
                                        )}
                                        {job.status === "completed" && (
                                            <div className="alert alert-success small mb-0">This job has been completed.</div>
                                        )}
                                    </section>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
