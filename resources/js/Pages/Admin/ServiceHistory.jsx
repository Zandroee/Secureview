import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

export default function ServiceHistory({ services = [], filters = {}, technicians = [], serviceIncomeSummary = {} }) {
    const serviceRows = services.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [serviceType, setServiceType] = useState(filters.service_type ?? "");
    const [urgency, setUrgency] = useState(filters.urgency ?? "");
    const [technician, setTechnician] = useState(filters.technician ? String(filters.technician) : "");
    const [recordStatus, setRecordStatus] = useState(filters.record_status ?? "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");

    const applySearch = (event) => {
        event.preventDefault();
        router.get(
            "/admin/service-history",
            { search, service_type: serviceType, urgency, technician, record_status: recordStatus, date_from: dateFrom, date_to: dateTo },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const clearSearch = () => {
        setSearch("");
        setServiceType("");
        setUrgency("");
        setTechnician("");
        setRecordStatus("");
        setDateFrom("");
        setDateTo("");
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
                                BACK TO SCHEDULED SERVICES
                            </Link>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-sm-6 col-xl-3">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">RECORDED SERVICE INCOME</div>
                                    <div className="fs-4 fw-bold text-primary">₱{Number(serviceIncomeSummary.recorded_service_income ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                            <div className="col-sm-6 col-xl-3">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">POST-SERVICE RECORDS</div>
                                    <div className="fs-4 fw-bold">{serviceIncomeSummary.service_records ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-sm-6 col-xl-3">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">PARTS REVENUE</div>
                                    <div className="fs-4 fw-bold text-success">₱{Number(serviceIncomeSummary.parts_revenue ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                            <div className="col-sm-6 col-xl-3">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">COMPLETED WITHOUT RECORD</div>
                                    <div className="fs-4 fw-bold text-warning-emphasis">{serviceIncomeSummary.completed_without_record ?? 0}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-3 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applySearch}>
                                <div className="col-12 col-xl-4">
                                    <label htmlFor="service-history-search" className="form-label small fw-semibold mb-1">SEARCH COMPLETED SERVICES</label>
                                    <input id="service-history-search" type="search" className="form-control" placeholder="Inquiry number, customer, or service" value={search} onChange={(event) => setSearch(event.target.value)} />
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">SERVICE TYPE</label>
                                    <select className="form-select" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
                                        <option value="">All service types</option>
                                        {["Installation", "Site Inspection", "Maintenance", "Repair", "Consultation", "Other"].map((value) => <option key={value} value={value}>{value}</option>)}
                                    </select>
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">URGENCY</label>
                                    <select className="form-select" value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                                        <option value="">All urgency</option>
                                        <option value="normal">Normal</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="emergency">Emergency</option>
                                    </select>
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">TECHNICIAN</label>
                                    <select className="form-select" value={technician} onChange={(event) => setTechnician(event.target.value)}>
                                        <option value="">All technicians</option>
                                        {technicians.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">POST-SERVICE RECORD</label>
                                    <select className="form-select" value={recordStatus} onChange={(event) => setRecordStatus(event.target.value)}>
                                        <option value="">All services</option>
                                        <option value="with_record">Has record</option>
                                        <option value="without_record">No record</option>
                                    </select>
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">BOOKING DATE FROM</label>
                                    <input type="date" className="form-control" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-6 col-xl-2">
                                    <label className="form-label small fw-semibold mb-1">BOOKING DATE TO</label>
                                    <input type="date" className="form-control" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                                    <button type="submit" className="btn btn-primary fw-bold">FILTER</button>
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={clearSearch}>CLEAR</button>
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
                                            <th>POST-SERVICE / INCOME</th>
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
                                                    {service.service_record ? (
                                                        <div>
                                                            <div className="fw-bold text-success">₱{Number(service.service_record.total_income ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            <div className="small text-muted">{service.service_record.items?.length ?? 0} part line(s)</div>
                                                            <div className="small text-break" title={service.service_record.work_summary}>{service.service_record.work_summary}</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis" title="No detailed post-service record is linked to this completed service.">No Post-Service Record</span>
                                                            <div className="small text-muted mt-1">Detailed work notes and parts used were not saved; this may be an older service from before records were introduced.</div>
                                                        </div>
                                                    )}
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
