import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router } from "@inertiajs/react";
import { useState } from "react";

export default function AdminStockAdjustments({ adjustments = [], staffUsers = [], filters = {} }) {
    const rows = adjustments.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [changedBy, setChangedBy] = useState(String(filters.changed_by ?? ""));
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/admin/stock-adjustments", {
            search,
            changed_by: changedBy,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const clearFilters = () => {
        setSearch("");
        setChangedBy("");
        setDateFrom("");
        setDateTo("");
        router.get("/admin/stock-adjustments", {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><Sidebar active="stock-adjustments" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                            <h1 className="fw-bold mb-1">STOCK ADJUSTMENT HISTORY</h1>
                            <div className="small text-muted">Review who changed stock, the previous and new quantities, and the reason. This page is restricted to administrators.</div>
                        </div>

                        <div className="bg-white border rounded-3 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applyFilters}>
                                <div className="col-lg-4">
                                    <label htmlFor="adjustment-search" className="form-label small fw-semibold mb-1">SEARCH</label>
                                    <input id="adjustment-search" className="form-control" placeholder="Product, reason, or staff member" value={search} onChange={(event) => setSearch(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label htmlFor="adjustment-by" className="form-label small fw-semibold mb-1">CHANGED BY</label>
                                    <select id="adjustment-by" className="form-select" value={changedBy} onChange={(event) => setChangedBy(event.target.value)}>
                                        <option value="">All staff</option>
                                        {staffUsers.map((person) => <option key={person.id} value={String(person.id)}>{person.name} ({person.role})</option>)}
                                    </select>
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label htmlFor="adjustment-from" className="form-label small fw-semibold mb-1">FROM</label>
                                    <input id="adjustment-from" type="date" className="form-control" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label htmlFor="adjustment-to" className="form-label small fw-semibold mb-1">TO</label>
                                    <input id="adjustment-to" type="date" min={dateFrom || undefined} className="form-control" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-1 d-grid"><button type="submit" className="btn btn-primary fw-bold">FILTER</button></div>
                                <div className="col-sm-6 col-lg-1 d-grid"><button type="button" className="btn btn-outline-primary fw-bold" onClick={clearFilters}>CLEAR</button></div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th className="ps-3">DATE</th><th>PRODUCT</th><th>CHANGED BY</th><th>STOCK CHANGE</th><th>REASON</th></tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center text-muted py-5">No stock adjustments found.</td></tr>
                                        ) : rows.map((adjustment) => (
                                            <tr key={adjustment.id}>
                                                <td className="ps-3 small">{adjustment.created_at}</td>
                                                <td className="fw-semibold">{adjustment.product_name}</td>
                                                <td>{adjustment.changed_by}</td>
                                                <td>
                                                    <div className="small text-muted">{adjustment.previous_quantity} → {adjustment.new_quantity}</div>
                                                    <span className={"badge rounded-pill " + (adjustment.quantity_change < 0 ? "bg-warning-subtle text-warning-emphasis" : "bg-success-subtle text-success")}>
                                                        {adjustment.quantity_change > 0 ? "+" : ""}{adjustment.quantity_change} units
                                                    </span>
                                                </td>
                                                <td className="small" style={{ minWidth: "220px" }}>{adjustment.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={adjustments} label="adjustments" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
