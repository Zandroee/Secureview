import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "in_progress") return "bg-primary-subtle text-primary";
    return "bg-info-subtle text-info-emphasis";
}

function formatStatus(status) {
    return String(status ?? "").replaceAll("_", " ");
}

function JobCard({ job, open = false }) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState("");

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

    return (
        <article className="bg-white border rounded-4 p-3 p-md-4 h-100" style={{ boxShadow: "0 3px 14px rgba(15,23,42,0.04)" }}>
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                <div>
                    <div className="small text-primary fw-bold">{job.inquiry_number}</div>
                    <h3 className="h5 fw-bold mb-1">{job.service_type}</h3>
                    <div className="small text-muted">{job.item_name || "General service"}</div>
                </div>
                {!open && <span className={"badge rounded-pill text-capitalize px-3 py-2 " + statusClass(job.status)}>{formatStatus(job.status)}</span>}
                {open && <span className="badge rounded-pill text-bg-success">Available to join</span>}
            </div>

            <div className="row g-2 small mb-3">
                <div className="col-6">
                    <div className="text-muted">DATE</div>
                    <div className="fw-semibold">{job.preferred_date || "Not set"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted">TIME</div>
                    <div className="fw-semibold">{job.preferred_time || "Not set"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted">LOCATION</div>
                    <div className="fw-semibold">{job.city || "Not specified"}</div>
                </div>
                <div className="col-6">
                    <div className="text-muted">PRIORITY</div>
                    <div className="fw-semibold text-capitalize">{job.urgency || "Normal"}</div>
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
                    {job.street_address && <div className="small text-muted mt-1">{job.street_address}</div>}
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
        </article>
    );
}

export default function TechnicianWorkspace({ jobs = [], openJobs = [], inventory = [] }) {
    const [stockChanges, setStockChanges] = useState({});
    const [stockErrors, setStockErrors] = useState({});
    const [stockSuccess, setStockSuccess] = useState("");
    const [savingProduct, setSavingProduct] = useState(null);

    const adjustStock = (event, product) => {
        event.preventDefault();
        setStockSuccess("");
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
                setStockSuccess("Stock adjustment saved.");
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
        <div>
            <Navbar />
            <main style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                <div className="container py-4 py-lg-5">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                            <div className="small text-primary fw-bold">SECUREVIEW · FIELD OPERATIONS</div>
                            <h1 className="fw-bold mb-1">Technician Workspace</h1>
                            <p className="text-muted mb-0">Your assigned services, available team jobs, and inventory.</p>
                        </div>
                        <Link href="/notifications" className="btn btn-outline-primary fw-semibold">
                            <i className="bi bi-bell me-2"></i>View notifications
                        </Link>
                    </div>

                    <div className="row g-3 mb-5">
                        <div className="col-6 col-lg-3">
                            <div className="bg-white border rounded-4 p-3 h-100">
                                <div className="small text-muted">MY ACTIVE JOBS</div>
                                <div className="display-6 fw-bold">{jobs.filter((job) => ["confirmed", "in_progress"].includes(job.status)).length}</div>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="bg-white border rounded-4 p-3 h-100">
                                <div className="small text-muted">IN PROGRESS</div>
                                <div className="display-6 fw-bold">{jobs.filter((job) => job.status === "in_progress").length}</div>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="bg-white border rounded-4 p-3 h-100">
                                <div className="small text-muted">OPEN TEAM JOBS</div>
                                <div className="display-6 fw-bold">{openJobs.length}</div>
                            </div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="bg-white border rounded-4 p-3 h-100">
                                <div className="small text-muted">PRODUCTS TRACKED</div>
                                <div className="display-6 fw-bold">{inventory.length}</div>
                            </div>
                        </div>
                    </div>

                    <section className="mb-5">
                        <div className="d-flex justify-content-between align-items-end gap-2 mb-3">
                            <div><h2 className="h3 fw-bold mb-1">My Service Jobs</h2><p className="text-muted mb-0">Only services assigned to you are shown here.</p></div>
                        </div>
                        {jobs.length ? (
                            <div className="row g-3">{jobs.map((job) => <div className="col-md-6 col-xl-4" key={job.id}><JobCard job={job} /></div>)}</div>
                        ) : <div className="bg-white border rounded-4 p-4 text-muted">No services have been assigned to you yet.</div>}
                    </section>

                    <section className="mb-5">
                        <h2 className="h3 fw-bold mb-1">Available Jobs</h2>
                        <p className="text-muted mb-3">Upcoming confirmed services are available to join when your schedule is free and the team has room.</p>
                        {openJobs.length ? (
                            <div className="row g-3">{openJobs.map((job) => <div className="col-md-6 col-xl-4" key={job.id}><JobCard job={job} open /></div>)}</div>
                        ) : <div className="bg-white border rounded-4 p-4 text-muted">There are no open team jobs right now.</div>}
                    </section>

                    <section>
                        <div className="mb-3"><h2 className="h3 fw-bold mb-1">Inventory</h2><p className="text-muted mb-0">Adjust stock with a reason. Every change is saved to an audit record.</p></div>
                        {stockSuccess && <div className="alert alert-success">{stockSuccess}</div>}
                        <div className="bg-white border rounded-4 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead className="table-light"><tr><th className="ps-3">Product</th><th>Category</th><th>Current stock</th><th>Adjustment</th><th>Reason</th><th></th></tr></thead>
                                    <tbody>
                                        {inventory.map((product) => (
                                            <tr key={product.id}>
                                                <td className="ps-3"><div className="fw-semibold">{product.name}</div></td>
                                                <td>{product.category}</td>
                                                <td><span className={"badge " + (product.stock_quantity <= 0 ? "text-bg-danger" : product.stock_quantity <= 5 ? "text-bg-warning" : "text-bg-success")}>{product.stock_quantity}</span></td>
                                                <td style={{ minWidth: 130 }}><input className="form-control form-control-sm" type="number" step="1" value={stockChanges[product.id]?.change ?? ""} placeholder="+5 / -2" onChange={(event) => updateStockField(product.id, "change", event.target.value)} /></td>
                                                <td style={{ minWidth: 210 }}><input className="form-control form-control-sm" value={stockChanges[product.id]?.reason ?? ""} placeholder="e.g. Used for installation" onChange={(event) => updateStockField(product.id, "reason", event.target.value)} />{stockErrors[product.id]?.reason && <div className="small text-danger mt-1">{stockErrors[product.id].reason}</div>}{stockErrors[product.id]?.quantity_change && <div className="small text-danger mt-1">{stockErrors[product.id].quantity_change}</div>}</td>
                                                <td className="pe-3"><button className="btn btn-sm btn-outline-primary fw-semibold" disabled={savingProduct === product.id} onClick={(event) => adjustStock(event, product)}>{savingProduct === product.id ? "SAVING" : "ADJUST"}</button></td>
                                            </tr>
                                        ))}
                                        {!inventory.length && <tr><td colSpan="6" className="text-center text-muted py-4">No products in inventory.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
