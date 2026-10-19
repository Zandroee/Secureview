import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function urgencyClass(urgency) {
    if (urgency === "emergency") return "bg-danger-subtle text-danger";
    if (urgency === "urgent") return "bg-warning-subtle text-warning-emphasis";
    return "bg-success-subtle text-success";
}

export default function ServiceHistory({ services = [], filters = {} }) {
    const serviceRows = services.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");

    const applySearch = (event) => {
        event.preventDefault();
        router.get(
            "/admin/service-history",
            { search },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const clearSearch = () => {
        setSearch("");
        router.get("/admin/service-history", {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="service-history" />
                    </aside>
                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                                <h1 className="fw-bold mb-1">SERVICE HISTORY</h1>
                                <div className="small text-muted">
                                    Completed services are archived here and no longer appear in active schedules.
                                </div>
                            </div>
                            <Link href="/admin/schedules" className="btn btn-outline-primary fw-bold">
                                <i className="bi bi-calendar3 me-2" />
                                BACK TO SCHEDULES
                            </Link>
                        </div>

                        <div className="bg-white border rounded-3 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applySearch}>
                                <div className="col-md-9">
                                    <label htmlFor="service-history-search" className="form-label small fw-semibold mb-1">
                                        SEARCH COMPLETED SERVICES
                                    </label>
                                    <input
                                        id="service-history-search"
                                        type="text"
                                        className="form-control"
                                        placeholder="Inquiry number, customer, or service"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </div>
                                <div className="col-md-3 d-flex gap-2">
                                    <button type="submit" className="btn btn-primary fw-bold flex-grow-1">
                                        SEARCH
                                    </button>
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={clearSearch}>
                                        CLEAR
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3" style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.05)" }}>
                            <div className="d-flex justify-content-between align-items-center gap-2 border-bottom p-3">
                                <h2 className="h6 fw-bold mb-0">Completed services</h2>
                                <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">
                                    {services.total ?? serviceRows.length} archived
                                </span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">SERVICE</th>
                                            <th>CUSTOMER</th>
                                            <th>SCHEDULED FOR</th>
                                            <th>TECHNICIAN TEAM</th>
                                            <th>PRIORITY</th>
                                            <th>COMPLETED / UPDATED</th>
                                            <th className="text-end pe-3">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center p-5">
                                                    <i className="bi bi-archive text-muted fs-3" />
                                                    <div className="fw-semibold mt-2">No completed services found</div>
                                                    <div className="small text-muted">
                                                        Completed jobs will appear here instead of the active schedule list.
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : serviceRows.map((service) => (
                                            <tr key={service.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold">{service.service_type}</div>
                                                    <div className="small text-muted">{service.item_name || "General service"}</div>
                                                    <div className="small text-muted">{service.inquiry_number}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">{service.customer_name}</div>
                                                    <div className="small text-muted text-break">{service.customer_email}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">{service.preferred_date || "—"}</div>
                                                    <div className="small text-muted">{service.preferred_time || "—"}</div>
                                                </td>
                                                <td>
                                                    {(service.technicians ?? []).length ? (
                                                        <div className="d-flex flex-column gap-1">
                                                            {service.technicians.map((technician) => (
                                                                <span className="small" key={technician.id}>{technician.name}</span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="small text-muted">No technician listed</span>}
                                                </td>
                                                <td>
                                                    <span className={"badge rounded-pill text-capitalize px-3 py-2 " + urgencyClass(service.urgency)}>
                                                        {service.urgency || "normal"}
                                                    </span>
                                                </td>
                                                <td className="small text-muted">{service.completed_at || "—"}</td>
                                                <td className="text-end pe-3">
                                                    <Link
                                                        href={"/admin/schedules/" + service.id + "?from=history"}
                                                        className="btn btn-outline-primary btn-sm fw-bold"
                                                    >
                                                        VIEW
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={services} label="completed services" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
