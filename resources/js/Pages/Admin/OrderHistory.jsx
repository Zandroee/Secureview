import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";

const peso = (value) => "₱" + Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const statusClass = (status) => status === "completed"
    ? "bg-success-subtle text-success"
    : "bg-danger-subtle text-danger";

const statusLabel = (value) => String(value ?? "unknown")
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());

const paymentLabel = (method) => ({
    cash: "Cash",
    gcash: "GCash",
    card: "Card",
    maya: "Maya",
}[String(method ?? "").toLowerCase()] ?? statusLabel(method));

const paymentStatusClass = (status) => status === "paid"
    ? "bg-success-subtle text-success"
    : ["cancelled", "failed"].includes(status)
        ? "bg-danger-subtle text-danger"
        : "bg-warning-subtle text-warning-emphasis";

export default function OrderHistory({ orders = {}, filters = {}, summary = {} }) {
    const rows = orders.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [orderStatus, setOrderStatus] = useState(filters.order_status ?? "");
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? "");
    const [paymentMethod, setPaymentMethod] = useState(filters.payment_method ?? "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/admin/order-history", {
            search,
            order_status: orderStatus,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            date_from: dateFrom,
            date_to: dateTo,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setOrderStatus("");
        setPaymentStatus("");
        setPaymentMethod("");
        setDateFrom("");
        setDateTo("");
        router.get("/admin/order-history", {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <div className="admin-page order-history-page">
            <Head title="Orders History | SecureView Admin" />
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="order-history" />
                    </aside>
                    <main id="main-content" aria-labelledby="order-history-title" className="col-md-9 col-lg-10 p-3 p-md-4" style={{ background: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                                <h1 id="order-history-title" className="fw-bold mb-1">ORDERS HISTORY</h1>
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
                            <details className="admin-order-history-filter-disclosure">
                                <summary className="admin-product-filter-summary">
                                    <span className="fw-semibold"><i className="bi bi-funnel me-2" />Filter order history</span>
                                    <span className="small text-muted">Search, status, payment and date range</span>
                                    <i className="bi bi-chevron-down ms-auto" aria-hidden="true" />
                                </summary>
                                <form className="row g-2 align-items-end admin-product-filter-form" onSubmit={applyFilters}>
                                <div className="col-12 col-lg-4">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-search">SEARCH ORDER HISTORY</label>
                                    <input id="order-history-search" type="search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer, email, or phone" />
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-status">ORDER STATUS</label>
                                    <select id="order-history-status" className="form-select" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
                                        <option value="">All history</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-payment-status">PAYMENT STATUS</label>
                                    <select id="order-history-payment-status" className="form-select" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                                        <option value="">All payment statuses</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-payment-method">PAYMENT METHOD</label>
                                    <select id="order-history-payment-method" className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                                        <option value="">All methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="gcash">GCash</option>
                                        <option value="card">Card</option>
                                        <option value="maya">Maya</option>
                                    </select>
                                </div>
                                <div className="col-sm-6 col-lg-1">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-date-from">DATE FROM</label>
                                    <input id="order-history-date-from" type="date" className="form-control" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-sm-6 col-lg-1">
                                    <label className="form-label small fw-semibold" htmlFor="order-history-date-to">DATE TO</label>
                                    <input id="order-history-date-to" type="date" className="form-control" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                                <div className="col-12 d-flex justify-content-end gap-2">
                                    <button type="submit" className="btn btn-primary fw-bold">FILTER ORDERS</button>
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={clearFilters}>CLEAR FILTERS</button>
                                </div>
                                </form>
                            </details>
                            <div className="small text-muted mt-2">
                                The selected date range also updates the summary cards above.
                            </div>
                        </section>

                        <section className="bg-white border rounded-4 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-center gap-2 border-bottom p-3">
                                <h2 className="h6 fw-bold mb-0">Archived orders</h2>
                                <span className="badge rounded-pill bg-secondary-subtle text-secondary px-3 py-2">{orders.total ?? rows.length} records</span>
                            </div>
                            <div className="admin-order-history-mobile-list d-md-none p-3">
                                {rows.length ? rows.map((order) => (
                                    <article className="admin-order-history-mobile-card" key={order.id} aria-labelledby={"order-history-mobile-title-" + order.id}>
                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                            <div className="min-w-0">
                                                <h2 id={"order-history-mobile-title-" + order.id} className="h6 fw-bold mb-1">{order.order_number}</h2>
                                                <div className="small text-muted">{order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? "item" : "items"}</div>
                                            </div>
                                            <span className={"badge rounded-pill text-capitalize flex-shrink-0 " + statusClass(order.order_status)}>{statusLabel(order.order_status)}</span>
                                        </div>
                                        <div className="border-top mt-3 pt-3">
                                            <div className="small fw-semibold">{order.customer_name || "Customer"}</div>
                                            <div className="small text-secondary text-break">{order.customer_email}</div>
                                        </div>
                                        <div className="admin-order-history-mobile-details">
                                            <div>
                                                <span className="admin-product-mobile-label">Total</span>
                                                <strong className="text-primary">{peso(order.total)}</strong>
                                            </div>
                                            <div>
                                                <span className="admin-product-mobile-label">Payment</span>
                                                <div className="fw-semibold">{paymentLabel(order.payment_method)}</div>
                                                <span className={"badge rounded-pill " + paymentStatusClass(order.payment_status)}>{statusLabel(order.payment_status)}</span>
                                            </div>
                                        </div>
                                        <div className="small text-muted mb-3"><i className="bi bi-calendar3 me-1" />{order.created_at || order.updated_at || "Date unavailable"}</div>
                                        <Link href={"/admin/purchases?search=" + encodeURIComponent(order.order_number) + "&order_status=" + encodeURIComponent(order.order_status) + "&view=" + order.id} className="btn btn-outline-primary fw-semibold w-100">
                                            <i className="bi bi-eye me-2" />View order
                                        </Link>
                                    </article>
                                )) : (
                                    <div className="text-center py-5">
                                        <i className="bi bi-archive fs-3 d-block text-secondary mb-2" />
                                        <div className="fw-semibold">No archived orders found</div>
                                        <div className="small text-secondary">Completed and cancelled orders will appear here.</div>
                                    </div>
                                )}
                            </div>
                            <div className="table-responsive d-none d-md-block">
                                <table className="table table-hover align-middle mb-0" style={{ width: "100%", minWidth: "1120px", tableLayout: "fixed" }}>
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3" style={{ width: "17%" }}>ORDER</th>
                                            <th style={{ width: "18%" }}>CUSTOMER</th>
                                            <th className="text-end pe-4" style={{ width: "15%" }}>TOTAL</th>
                                            <th className="border-start ps-4" style={{ width: "18%" }}>PAYMENT</th>
                                            <th style={{ width: "13%" }}>ORDER STATUS</th>
                                            <th style={{ width: "10%" }}>DATE</th>
                                            <th className="text-end pe-3" style={{ width: "9%" }}>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((order) => (
                                            <tr key={order.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold">{order.order_number}</div>
                                                    <div className="small text-secondary">{order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? "item" : "items"}</div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">{order.customer_name}</div>
                                                    <div className="small text-secondary text-break">{order.customer_email}</div>
                                                </td>
                                                <td className="text-end fw-bold text-primary text-nowrap pe-4">{peso(order.total)}</td>
                                                <td className="border-start ps-4">
                                                    <div className="small fw-semibold text-break">{paymentLabel(order.payment_method)}</div>
                                                    <span className={"badge rounded-pill " + paymentStatusClass(order.payment_status)}>{statusLabel(order.payment_status)}</span>
                                                </td>
                                                <td><span className={"badge rounded-pill text-capitalize " + statusClass(order.order_status)}>{statusLabel(order.order_status)}</span></td>
                                                <td className="small text-secondary">{order.created_at || order.updated_at || "—"}</td>
                                                <td className="text-end pe-3">
                                                    <Link href={"/admin/purchases?search=" + encodeURIComponent(order.order_number) + "&order_status=" + encodeURIComponent(order.order_status) + "&view=" + order.id} className="btn btn-sm btn-outline-primary fw-semibold text-nowrap">VIEW</Link>
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
