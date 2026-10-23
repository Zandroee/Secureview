import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function money(value) { return "₱" + Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function statusClass(status) {
    if (["completed", "delivered", "paid"].includes(status)) return "bg-success-subtle text-success";
    if (["cancelled", "failed", "payment_failed"].includes(status)) return "bg-danger-subtle text-danger";
    if (["pending", "awaiting_payment"].includes(status)) return "bg-warning-subtle text-warning-emphasis";
    return "bg-primary-subtle text-primary";
}

export default function OrderHistory({ orders = [], filters = {}, summary = {} }) {
    const rows = orders.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.order_status ?? "");
    const [viewing, setViewing] = useState(null);

    const apply = (event) => {
        event.preventDefault();
        router.get("/admin/order-history", { search, order_status: status }, { preserveState: true, preserveScroll: true, replace: true });
    };
    const clear = () => {
        setSearch(""); setStatus("");
        router.get("/admin/order-history", {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid"><div className="row">
                <aside className="col-md-3 col-lg-2 px-0"><Sidebar active="order-history" /></aside>
                <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div><div className="small text-primary fw-bold">SECUREVIEW ADMIN</div><h1 className="fw-bold mb-1">ORDER HISTORY</h1><div className="small text-muted">Completed, delivered, and cancelled orders.</div></div>
                        <Link href="/admin/purchases" className="btn btn-outline-primary fw-bold"><i className="bi bi-bag-check me-2" />BACK TO ORDERS</Link>
                    </div>
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3"><div className="small text-muted fw-semibold">ARCHIVED ORDERS</div><div className="h3 fw-bold mt-2 mb-0">{summary.total ?? 0}</div></div></div>
                        <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3"><div className="small text-muted fw-semibold">FULFILLED</div><div className="h3 fw-bold text-success mt-2 mb-0">{summary.completed ?? 0}</div></div></div>
                        <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3"><div className="small text-muted fw-semibold">CANCELLED</div><div className="h3 fw-bold text-danger mt-2 mb-0">{summary.cancelled ?? 0}</div></div></div>
                        <div className="col-6 col-xl-3"><div className="bg-white border rounded-3 p-3"><div className="small text-muted fw-semibold">PAID FULFILLED REVENUE</div><div className="h3 fw-bold mt-2 mb-0">{money(summary.paid_revenue)}</div></div></div>
                    </div>
                    <div className="bg-white border rounded-3 p-3 mb-3">
                        <form className="row g-2 align-items-end" onSubmit={apply}>
                            <div className="col-12 col-lg-8"><label className="form-label small fw-semibold mb-1">SEARCH ORDERS</label><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer, email, or product" /></div>
                            <div className="col-6 col-lg-2"><label className="form-label small fw-semibold mb-1">STATUS</label><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All archived</option><option value="completed">Completed</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
                            <div className="col-6 col-lg-2 d-flex gap-2"><button className="btn btn-primary fw-bold flex-grow-1" type="submit">FILTER</button><button className="btn btn-outline-secondary fw-bold" type="button" onClick={clear}>CLEAR</button></div>
                        </form>
                    </div>
                    <div className="bg-white border rounded-3 overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom"><h2 className="h6 fw-bold mb-0">Archived orders</h2><span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">{orders.total ?? rows.length} orders</span></div>
                        <div className="table-responsive"><table className="table table-hover align-middle mb-0">
                            <thead className="table-light"><tr><th className="ps-3">ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th>ORDER STATUS</th><th className="text-end pe-3">DETAILS</th></tr></thead>
                            <tbody>{!rows.length ? <tr><td colSpan="7" className="text-center p-5"><i className="bi bi-archive fs-3 text-muted" /><div className="fw-semibold mt-2">No archived orders found</div></td></tr> : rows.map((order) => <tr key={order.id}>
                                <td className="ps-3"><div className="fw-bold">{order.order_number}</div><div className="small text-muted">{order.created_at}</div></td>
                                <td><div className="fw-semibold">{order.customer_name}</div><div className="small text-muted text-break">{order.customer_email}</div></td>
                                <td>{(order.items ?? []).map((item) => item.name).join(", ") || "—"}</td>
                                <td className="fw-bold text-nowrap">{money(order.total)}</td>
                                <td><span className={"badge rounded-pill text-capitalize " + statusClass(order.payment_status)}>{order.payment_status}</span></td>
                                <td><span className={"badge rounded-pill text-capitalize " + statusClass(order.order_status)}>{order.order_status.replaceAll("_", " ")}</span></td>
                                <td className="text-end pe-3"><button className="btn btn-sm btn-outline-primary fw-bold" type="button" onClick={() => setViewing(viewing === order.id ? null : order.id)}>{viewing === order.id ? "HIDE" : "VIEW"}</button></td>
                            </tr>).flatMap((row, index) => {
                                const order = rows[index];
                                return viewing === order.id ? [row, <tr key={order.id + "-details"}><td colSpan="7" className="p-3 bg-body-tertiary"><div className="row g-3"><div className="col-md-6"><div className="fw-bold mb-2">Items</div>{(order.items ?? []).map((item) => <div key={item.id} className="d-flex justify-content-between gap-2 border-bottom py-1"><span>{item.name} × {item.quantity}</span><span className="text-nowrap">{money(item.subtotal)}</span></div>)}</div><div className="col-md-6"><div className="fw-bold mb-2">Order timeline</div>{(order.timeline ?? []).length ? order.timeline.map((event) => <div key={event.id} className="small mb-2"><strong>{event.title}</strong><div>{event.description}</div><span className="text-muted">{event.created_at} · {event.actor_name}</span></div>) : <div className="small text-muted">No timeline events recorded.</div>}</div></div></td></tr>] : [row];
                            })}</tbody>
                        </table></div>
                        <AdminPagination pagination={orders} label="archived orders" insideCard />
                    </div>
                </main>
            </div></div>
            <Footer />
        </div>
    );
}
