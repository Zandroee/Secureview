import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

const peso = (value) => "₱" + Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const statusClass = (status) => status === "completed"
    ? "bg-success-subtle text-success"
    : "bg-danger-subtle text-danger";

export default function OrderHistory({ orders = {}, filters = {}, summary = {} }) {
    const rows = orders.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [orderStatus, setOrderStatus] = useState(filters.order_status ?? "");

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/admin/order-history", { search, order_status: orderStatus }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setOrderStatus("");
        router.get("/admin/order-history", {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <div className="admin-page order-history-page">
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="order-history" />
                    </aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ background: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                                <h1 className="fw-bold mb-1">ORDERS HISTORY</h1>
                                <p className="text-secondary mb-0">Completed and cancelled orders are archived here for reference and audit.</p>
                            </div>
                            <Link href="/admin/purchases" className="btn btn-outline-primary fw-bold">
                                <i className="bi bi-arrow-left me-2" />BACK TO ORDERS
                            </Link>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-sm-6 col-xl-4">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">COMPLETED ORDERS</div>
                                    <div className="fs-3 fw-bold text-success">{summary.completed_orders ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-sm-6 col-xl-4">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">CANCELLED ORDERS</div>
                                    <div className="fs-3 fw-bold text-danger">{summary.cancelled_orders ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-sm-6 col-xl-4">
                                <div className="bg-white border rounded-4 p-3 h-100">
                                    <div className="small text-secondary fw-semibold">COMPLETED PAID SALES</div>
                                    <div className="fs-3 fw-bold text-primary">{peso(summary.completed_paid_revenue)}</div>
                                </div>
                            </div>
                        </div>

                        <section className="bg-white border rounded-4 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applyFilters}>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-search">SEARCH ORDER HISTORY</label>
                                    <input id="order-history-search" type="search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer, email, or phone" />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-status">STATUS</label>
                                    <select id="order-history-status" className="form-select" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
                                        <option value="">All history</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="col-md-3 d-flex gap-2">
                                    <button type="submit" className="btn btn-primary fw-bold flex-grow-1">FILTER</button>
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={clearFilters}>CLEAR</button>
                                </div>
                            </form>
                        </section>

                        <section className="bg-white border rounded-4 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-center gap-2 border-bottom p-3">
                                <h2 className="h6 fw-bold mb-0">Archived orders</h2>
                                <span className="badge rounded-pill bg-secondary-subtle text-secondary px-3 py-2">{orders.total ?? rows.length} records</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">ORDER</th>
                                            <th>CUSTOMER</th>
                                            <th>DATE</th>
                                            <th>PAYMENT</th>
                                            <th>STATUS</th>
                                            <th className="text-end">TOTAL</th>
                                            <th className="text-end pe-3">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((order) => (
                                            <tr key={order.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold">{order.order_number}</div>
                                                    <div className="small text-secondary">{order.payment_method?.toUpperCase()}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">{order.customer_name}</div>
                                                    <div className="small text-secondary text-break">{order.customer_email}</div>
                                                </td>
                                                <td className="small text-secondary">{order.updated_at || order.created_at || "—"}</td>
                                                <td><span className={"badge rounded-pill " + (order.payment_status === "paid" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning-emphasis")}>{order.payment_status}</span></td>
                                                <td><span className={"badge rounded-pill text-capitalize " + statusClass(order.order_status)}>{String(order.order_status).replaceAll("_", " ")}</span></td>
                                                <td className="text-end fw-bold text-nowrap">{peso(order.total)}</td>
                                                <td className="text-end pe-3">
                                                    <Link href={"/admin/purchases?search=" + encodeURIComponent(order.order_number) + "&order_status=" + encodeURIComponent(order.order_status)} className="btn btn-sm btn-outline-primary fw-semibold text-nowrap">VIEW RECORD</Link>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={7} className="text-center py-5">
                                                <i className="bi bi-archive fs-3 d-block text-secondary mb-2" />
                                                <div className="fw-semibold">No archived orders found</div>
                                                <div className="small text-secondary">Completed and cancelled orders will appear here.</div>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={orders} label="orders history" insideCard />
                        </section>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
