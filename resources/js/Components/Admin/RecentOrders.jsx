import { Link } from "@inertiajs/react";
import { useState } from "react";
import PanelPagination from "./PanelPagination";

function badgeClass(status) {
    if (["paid", "completed", "delivered"].includes(status)) return "bg-success-subtle text-success";
    if (["failed", "payment_failed", "cancelled"].includes(status)) return "bg-danger-subtle text-danger";
    if (["pending", "awaiting_payment"].includes(status)) return "bg-warning-subtle text-warning-emphasis";
    return "bg-primary-subtle text-primary";
}

function label(status) {
    return String(status || "unknown").replace(/_/g, " ");
}

export default function RecentOrders({ orders = [] }) {
    const [page, setPage] = useState(1);
    const pageSize = 3;
    const totalPages = Math.ceil(orders.length / pageSize);
    const safePage = Math.min(page, Math.max(1, totalPages));
    const pageOrders = orders.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <section className="card border rounded-3">
            <div className="card-body p-3 p-lg-4">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">Recent Orders</h5>
                        <p className="small text-muted mb-0">Latest customer purchases and payment status.</p>
                    </div>
                    <Link href="/admin/purchases" className="btn btn-sm btn-outline-primary text-nowrap">
                        View all
                    </Link>
                </div>

                {orders.length ? (
                    <div className="d-flex flex-column gap-2">
                        {pageOrders.map((order) => (
                            <Link
                                key={order.id}
                                href={"/admin/purchases?search=" + encodeURIComponent(order.order_number || "")}
                                className="border rounded-3 p-3 text-decoration-none text-reset"
                            >
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div className="fw-bold">{order.order_number || "Order #" + order.id}</div>
                                    <span className={"badge rounded-pill text-capitalize " + badgeClass(order.order_status)}>
                                        {label(order.order_status)}
                                    </span>
                                </div>
                                <div className="small text-muted mt-1">
                                    {order.customer_name || "Customer"} · {order.created_at}
                                </div>
                                <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                                    <span className="small text-muted">Payment</span>
                                    <span className={"badge rounded-pill text-capitalize " + badgeClass(order.payment_status)}>
                                        {label(order.payment_status)}
                                    </span>
                                </div>
                                <div className="fw-bold mt-2">₱{Number(order.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </Link>
                        ))}
                    </div>
                    <PanelPagination
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={orders.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                    />
                ) : (
                    <div className="text-center border rounded-3 bg-light p-4">
                        <i className="bi bi-bag fs-4 text-muted d-block mb-2" />
                        <p className="small text-muted mb-2">No orders have been placed yet.</p>
                        <Link href="/admin/purchases" className="small fw-semibold text-decoration-none">Open order management</Link>
                    </div>
                )}
            </div>
        </section>
    );
}
