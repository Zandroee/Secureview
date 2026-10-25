import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router } from "@inertiajs/react";
import { useState } from "react";

export default function AdminInventoryAdjustments({ adjustments = [], filters = {} }) {
    const rows = adjustments.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");
    const [direction, setDirection] = useState(filters.direction ?? "");

    const applySearch = (event) => {
        event.preventDefault();
        router.get("/admin/inventory-adjustments", { search, date_from: dateFrom, date_to: dateTo, direction }, {
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
                    <aside className="col-md-3 col-lg-2 px-0"><Sidebar active="inventory-adjustments" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                            <h1 className="fw-bold mb-1">INVENTORY ADJUSTMENT HISTORY</h1>
                            <p className="text-muted mb-0">Audit stock changes made by administrators and technicians.</p>
                        </div>

                        <form onSubmit={applySearch} className="bg-white border rounded-3 p-3 mb-3">
                            <div className="row g-2 align-items-end">
                                <div className="col-12 col-lg-4">
                                    <label className="form-label small fw-semibold mb-1">SEARCH</label>
                                    <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, reason, or staff member" />
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">DIRECTION</label>
                                    <select className="form-select" value={direction} onChange={(event) => setDirection(event.target.value)}>
                                        <option value="">All changes</option>
                                        <option value="increase">Stock increases</option>
                                        <option value="decrease">Stock decreases</option>
                                    </select>
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">DATE FROM</label>
                                    <input type="date" className="form-control" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">DATE TO</label>
                                    <input type="date" className="form-control" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-2 d-flex gap-2">
                                    <button className="btn btn-primary fw-bold flex-grow-1" type="submit">FILTER</button>
                                    <button className="btn btn-outline-secondary fw-semibold" type="button" onClick={() => {
                                        setSearch(""); setDateFrom(""); setDateTo(""); setDirection("");
                                        router.get("/admin/inventory-adjustments", {}, { preserveState: true, preserveScroll: true, replace: true });
                                    }}>CLEAR</button>
                                </div>
                            </div>
                        </form>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th className="ps-3">Date</th><th>Product</th><th>Changed by</th><th>Before</th><th>Change</th><th>After</th><th>Reason</th></tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((row) => (
                                            <tr key={row.id}>
                                                <td className="ps-3 text-nowrap small">{row.created_at}</td>
                                                <td className="fw-semibold">{row.product_name}</td>
                                                <td><div className="fw-semibold">{row.actor_name}</div><div className="small text-muted">{row.actor_email}</div></td>
                                                <td>{row.previous_quantity}</td>
                                                <td><span className={"badge " + (row.quantity_change < 0 ? "text-bg-warning" : "text-bg-success")}>{row.quantity_change > 0 ? "+" : ""}{row.quantity_change}</span></td>
                                                <td className="fw-bold">{row.new_quantity}</td>
                                                <td>{row.reason}</td>
                                            </tr>
                                        )) : <tr><td colSpan="7" className="text-center text-muted py-5">No stock adjustments recorded yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={adjustments} label="stock adjustments" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
