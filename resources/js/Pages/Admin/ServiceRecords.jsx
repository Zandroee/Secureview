import { Fragment } from "react";
import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router } from "@inertiajs/react";
import { useState } from "react";

function money(value) {
    return "₱" + Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paymentBadge(status) {
    if (status === "paid") return "bg-success-subtle text-success";
    if (status === "not_required") return "bg-secondary-subtle text-secondary";
    return "bg-warning-subtle text-warning-emphasis";
}

export default function ServiceRecords({ records = [], filters = {}, summary = {} }) {
    const rows = records.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");
    const [expanded, setExpanded] = useState(null);

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/admin/service-records", {
            search,
            payment_status: paymentStatus,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const clearFilters = () => {
        setSearch("");
        setPaymentStatus("");
        setDateFrom("");
        setDateTo("");
        router.get("/admin/service-records", {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const confirmPayment = (record) => {
        let method = record.payment_method;
        if (!method) {
            method = window.prompt("Enter the payment method confirmed received: cash, gcash, card, or maya", "cash");
            if (method === null) return;
            method = method.trim().toLowerCase();
        }
        if (!["cash", "gcash", "card", "maya"].includes(method)) {
            window.alert("Enter cash, gcash, card, or maya.");
            return;
        }
        if (!window.confirm("Confirm that ₱" + Number(record.service_charge).toFixed(2) + " has actually been received for " + record.inquiry_number + "? This will add it to paid service income.")) return;

        router.patch("/admin/service-records/" + record.id + "/confirm-payment", { payment_method: method }, {
            preserveScroll: true,
        });
    };


    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><Sidebar active="service-records" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                                <h1 className="fw-bold mb-1">POST-SERVICE RECORDS</h1>
                                <div className="small text-muted">Review technician work notes, replacement parts, and recorded service income.</div>
                            </div>
                            <a href="/admin/schedules" className="btn btn-outline-primary fw-bold"><i className="bi bi-calendar3 me-2" />BACK TO SCHEDULES</a>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3 h-100"><div className="small text-muted fw-semibold">TOTAL RECORDS</div><div className="h3 fw-bold mt-2 mb-0">{summary.records ?? 0}</div></div></div>
                            <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3 h-100"><div className="small text-muted fw-semibold">PAID SERVICE INCOME</div><div className="h3 fw-bold text-success mt-2 mb-0">{money(summary.paid_service_income)}</div></div></div>
                            <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3 h-100"><div className="small text-muted fw-semibold">PENDING SERVICE CHARGES</div><div className="h3 fw-bold text-warning-emphasis mt-2 mb-0">{money(summary.pending_service_charges)}</div></div></div>
                            <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3 h-100"><div className="small text-muted fw-semibold">PRODUCT UNITS USED</div><div className="h3 fw-bold mt-2 mb-0">{summary.products_used ?? 0}</div></div></div>
                        </div>

                        <div className="bg-white border rounded-3 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applyFilters}>
                                <div className="col-12 col-lg-4">
                                    <label className="form-label small fw-semibold mb-1">SEARCH SERVICE RECORDS</label>
                                    <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Service number, customer, technician" />
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">PAYMENT</label>
                                    <select className="form-select" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                                        <option value="">All payments</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="not_required">No charge</option>
                                    </select>
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">FROM</label>
                                    <input type="date" className="form-control" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">TO</label>
                                    <input type="date" className="form-control" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                                <div className="col-6 col-lg-2 d-flex gap-2">
                                    <button className="btn btn-primary fw-bold flex-grow-1" type="submit">FILTER</button>
                                    <button className="btn btn-outline-secondary fw-bold" type="button" onClick={clearFilters}>CLEAR</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-center gap-2 border-bottom p-3">
                                <h2 className="h6 fw-bold mb-0">Service record ledger</h2>
                                <span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">{records.total ?? rows.length} records</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light"><tr><th className="ps-3">SERVICE / CUSTOMER</th><th>TECHNICIAN</th><th>WORK SUMMARY</th><th>PARTS USED</th><th>SERVICE CHARGE</th><th>PAYMENT</th><th className="text-end pe-3">DETAILS</th></tr></thead>
                                    <tbody>
                                        {!rows.length ? (
                                            <tr><td colSpan="7" className="text-center p-5"><i className="bi bi-journal-text fs-3 text-muted" /><div className="fw-semibold mt-2">No service records found</div><div className="small text-muted">Records appear after a technician submits a post-service report.</div></td></tr>
                                         ) : rows.map((record) => (
                                            <Fragment key={record.id}>
                                                <tr>
                                                    <td className="ps-3"><div className="fw-bold">{record.inquiry_number}</div><div className="small text-muted">{record.customer_name} · {record.service_type}{record.other_service_type ? " · " + record.other_service_type : ""}</div><div className="small text-muted">{record.created_at}</div></td>
                                                    <td>{record.technician_name}</td>
                                                    <td style={{ minWidth: 220, maxWidth: 340 }}><div className="text-truncate" title={record.work_summary}>{record.work_summary}</div><div className="small text-muted">{record.service_outcome.replaceAll("_", " ")}</div></td>
                                                    <td><span className="badge bg-light text-dark border">{record.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} unit(s)</span></td>
                                                    <td className="fw-bold">{money(record.service_charge)}</td>
                                                    <td><span className={"badge rounded-pill text-capitalize px-3 py-2 " + paymentBadge(record.payment_status)}>{record.payment_status}</span><div className="small text-muted mt-1">{record.payment_method || "No payment recorded"}</div></td>
                                                    <td className="text-end pe-3">
                                                        <div className="d-flex flex-column flex-xl-row justify-content-end gap-1">
                                                            {record.payment_status === "pending" && Number(record.service_charge) > 0 && (
                                                                <button type="button" className="btn btn-sm btn-success fw-bold text-nowrap" onClick={() => confirmPayment(record)}>CONFIRM PAYMENT</button>
                                                            )}
                                                            <button type="button" className="btn btn-sm btn-outline-primary fw-bold" onClick={() => setExpanded(expanded === record.id ? null : record.id)}>{expanded === record.id ? "HIDE" : "VIEW"}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expanded === record.id && (
                                                    <tr key={record.id + "-details"}><td colSpan="7" className="bg-body-tertiary p-3 p-lg-4">
                                                        <div className="row g-3">
                                                            <div className="col-lg-6"><h3 className="h6 fw-bold">Work performed</h3><p className="mb-3" style={{ whiteSpace: "pre-wrap" }}>{record.work_summary}</p><h3 className="h6 fw-bold">Recommendations</h3><p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{record.recommendations || "No follow-up recommendations."}</p></div>
                                                            <div className="col-lg-6"><h3 className="h6 fw-bold">Products removed from stock</h3>{record.items.length ? <div className="d-flex flex-column gap-2">{record.items.map((item, i) => <div key={i} className="d-flex justify-content-between gap-3 border rounded-2 p-2 bg-white"><div><div className="fw-semibold">{item.product_name}</div><div className="small text-muted">{item.notes || "No item note"}</div></div><div className="text-nowrap fw-bold">× {item.quantity}</div></div>)}</div> : <p className="small text-muted mb-0">No inventory items were used.</p>}</div>
                                                        </div>
                                                    </td></tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={records} label="service records" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
