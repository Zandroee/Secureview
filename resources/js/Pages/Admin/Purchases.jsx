import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

function paymentClass(status) {
    if (status === "paid") {
        return "bg-success-subtle text-success";
    }

    if (status === "failed") {
        return "bg-danger-subtle text-danger";
    }

    return "bg-warning-subtle text-warning-emphasis";
}

function orderClass(status) {
    if (status === "completed" || status === "delivered") {
        return "bg-success-subtle text-success";
    }

    if (status === "cancelled" || status === "payment_failed") {
        return "bg-danger-subtle text-danger";
    }

    if (status === "pending" || status === "awaiting_payment") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-primary-subtle text-primary";
}

function paymentLabel(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    return "Cash";
}

function statusLabel(status) {
    return status.replace(/_/g, " ");
}

export default function AdminPurchases({
    orders = [],
    attentionOrders = [],
    summary = {},
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [paymentStatus, setPaymentStatus] = useState(
        filters.payment_status ?? ""
    );
    const [orderStatus, setOrderStatus] = useState(
        filters.order_status ?? ""
    );
    const [paymentMethod, setPaymentMethod] = useState(
        filters.payment_method ?? ""
    );
    const [attentionFilter, setAttentionFilter] = useState(filters.attention ?? "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");
    const [viewingOrder, setViewingOrder] = useState(null);
    const [cancellingOrderId, setCancellingOrderId] = useState(null);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [recordingInvoiceId, setRecordingInvoiceId] = useState(null);
    const { props } = usePage();
    const orderRows = orders.data ?? (Array.isArray(orders) ? orders : []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const requestedOrderId = new URLSearchParams(window.location.search).get("view");
        if (!requestedOrderId) return;

        const matchingOrder = orderRows.find((order) => String(order.id) === requestedOrderId);
        if (matchingOrder) {
            setViewingOrder(matchingOrder);
        }
    }, [orderRows]);

    const cancelOrder = (order) => {
        const reason = window.prompt(
            "Enter the cancellation reason for " + order.order_number + " (required, at least 5 characters).",
            order.payment_status === "failed" ? "Payment failed and customer did not proceed" : "Payment was not completed"
        );

        if (reason === null) return;

        if (reason.trim().length < 5) {
            window.alert("Please enter a cancellation reason with at least 5 characters.");
            return;
        }

        if (!window.confirm(
            "Cancel unpaid order " + order.order_number + "? The reason will be saved in order history. Paid orders cannot be cancelled here.\n\nReason: " + reason.trim()
        )) {
            return;
        }

        setCancellingOrderId(order.id);
        router.patch(
            "/admin/purchases/" + order.id + "/cancel",
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setViewingOrder(null),
                onFinish: () => setCancellingOrderId(null),
            }
        );
    };

    const runOrderAction = (order, action) => {
        const confirmation = action === "confirm-cash-payment"
            ? "Confirm that cash has actually been received for order " + order.order_number + "? This will mark the payment as paid and move the order to Processing."
            : "Confirm that order " + order.order_number + " has been fulfilled? This will mark it Completed. SecureView does not track shipments.";

        if (!window.confirm(confirmation)) {
            return;
        }

        setUpdatingOrderId(order.id);
        router.patch(
            "/admin/purchases/" + order.id + "/" + action,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setViewingOrder(null),
                onFinish: () => setUpdatingOrderId(null),
            }
        );
    };

    const recordInvoice = (order) => {
        const message =
            "Save an immutable internal invoice record for " + order.order_number + "?\n\n" +
            "This preserves the seller, customer, item, and total details as they are now. " +
            "It does not consume an authorized BIR invoice number and is not a BIR-registered tax invoice.";
        if (!window.confirm(message)) return;

        setRecordingInvoiceId(order.id);
        router.post("/admin/purchases/" + order.id + "/invoice-record", {}, {
            preserveScroll: true,
            onSuccess: () => setViewingOrder(null),
            onFinish: () => setRecordingInvoiceId(null),
        });
    };

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/purchases",
            {
                search,
                payment_status: paymentStatus,
                order_status: orderStatus,
                payment_method: paymentMethod,
                attention: attentionFilter,
                date_from: dateFrom,
                date_to: dateTo,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const applyQuickFilter = (preset) => {
        const next = {
            search: "",
            payment_status: preset.payment_status ?? "",
            order_status: preset.order_status ?? "",
            payment_method: preset.payment_method ?? "",
            attention: preset.attention ?? "",
            date_from: dateFrom,
            date_to: dateTo,
        };

        setSearch(next.search);
        setPaymentStatus(next.payment_status);
        setOrderStatus(next.order_status);
        setPaymentMethod(next.payment_method);
        setAttentionFilter(next.attention);

        router.get("/admin/purchases", next, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setPaymentStatus("");
        setOrderStatus("");
        setPaymentMethod("");
        setAttentionFilter("");
        setDateFrom("");
        setDateTo("");

        router.get(
            "/admin/purchases",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="purchases" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">
                                SECUREVIEW ADMIN
                            </div>

                            <h1 className="fw-bold mb-1">
                                ORDER MANAGEMENT
                            </h1>

                            <div className="small text-muted">
                                Review orders, manage failed or pending payments, and cancel eligible unpaid orders.
                            </div>
                        </div>

                        {props.flash?.success && (
                            <div className="alert alert-success">{props.flash.success}</div>
                        )}
                        {props.errors?.order && (
                            <div className="alert alert-danger">{props.errors.order}</div>
                        )}
                        {props.errors?.stock && (
                            <div className="alert alert-danger">{props.errors.stock}</div>
                        )}
                        {props.errors?.invoice && (
                            <div className="alert alert-danger">{props.errors.invoice}</div>
                        )}

                        <div className="small text-muted mb-3">
                            SecureView does not currently have shipment tracking. “Delivered” is not offered as an action; it will only appear in the dashboard if a legacy delivered order already exists.
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TOTAL ORDERS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.total_orders ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PAID ORDERS
                                    </div>

                                    <div className="h4 fw-bold text-success mb-0">
                                        {summary.paid_orders ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PENDING PAYMENTS
                                    </div>

                                    <div className="h4 fw-bold text-warning-emphasis mb-0">
                                        {summary.pending_payments ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PAID REVENUE
                                    </div>

                                    <div className="h4 fw-bold text-primary mb-0">
                                        ₱{Number(
                                            summary.revenue ?? 0
                                        ).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <section className="bg-white border rounded-3 p-3 p-lg-4 mb-3" style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.04)" }}>
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                                <div>
                                    <h2 className="h5 fw-bold mb-1">Payment queue</h2>
                                    <p className="small text-muted mb-0">Orders that may need follow-up. Selecting a card filters the order list below.</p>
                                </div>
                                <span className="small text-muted">{attentionOrders.length} unpaid orders shown</span>
                            </div>

                            <div className="row g-2 mb-4">
                                <div className="col-6 col-xl-3">
                                    <button type="button" onClick={() => applyQuickFilter({ payment_status: "pending", order_status: "awaiting_payment" })} className="btn text-start w-100 h-100 border rounded-3 p-3 bg-warning-subtle">
                                        <div className="small text-secondary fw-semibold">PENDING ONLINE</div>
                                        <div className="h3 fw-bold mb-1 text-warning-emphasis">{summary.pending_online_payments ?? 0}</div>
                                        <div className="small text-secondary">GCash, Card, or Maya payment not confirmed. Auto-cancels after 48 hours unpaid.</div>
                                    </button>
                                </div>
                                <div className="col-6 col-xl-3">
                                    <button type="button" onClick={() => applyQuickFilter({ payment_status: "failed", order_status: "payment_failed" })} className="btn text-start w-100 h-100 border rounded-3 p-3 bg-danger-subtle">
                                        <div className="small text-secondary fw-semibold">PAYMENT FAILED</div>
                                        <div className="h3 fw-bold mb-1 text-danger">{summary.failed_payments ?? 0}</div>
                                        <div className="small text-secondary">Payment failed. Customer may retry; unpaid orders auto-cancel after 48 hours.</div>
                                    </button>
                                </div>
                                <div className="col-6 col-xl-3">
                                    <button type="button" onClick={() => applyQuickFilter({ payment_status: "pending", order_status: "pending", payment_method: "cash" })} className="btn text-start w-100 h-100 border rounded-3 p-3 bg-info-subtle">
                                        <div className="small text-secondary fw-semibold">CASH TO CONFIRM</div>
                                        <div className="h3 fw-bold mb-1 text-info-emphasis">{summary.cash_awaiting_confirmation ?? 0}</div>
                                        <div className="small text-secondary">Confirm only after cash is received. Unpaid orders auto-cancel after 48 hours.</div>
                                    </button>
                                </div>
                                <div className="col-6 col-xl-3">
                                    <button type="button" onClick={() => applyQuickFilter({ attention: "stale" })} className="btn text-start w-100 h-100 border rounded-3 p-3 bg-light">
                                        <div className="small text-secondary fw-semibold">UNPAID OVER 48 HOURS</div>
                                        <div className="h3 fw-bold mb-1 text-dark">{summary.stale_unpaid_orders ?? 0}</div>
                                        <div className="small text-secondary">The automatic cancellation deadline has passed.</div>
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                                <h3 className="h6 fw-bold mb-0">Needs attention</h3>
                                <button type="button" className="btn btn-link btn-sm text-decoration-none" onClick={() => applyQuickFilter({})}>View all orders</button>
                            </div>

                            {attentionOrders.length ? (
                                <div className="d-flex flex-column gap-2">
                                    {attentionOrders.map((order) => {
                                        const actionText = order.is_stale_unpaid
                                            ? "Unpaid for over 48 hours. The scheduled job will cancel it after verifying payment is still unpaid."
                                            : order.next_action === "confirm_cash_payment"
                                                ? "Payment is pending. Confirm only after cash has been received; unpaid orders auto-cancel after 48 hours."
                                                : order.next_action === "retry_or_cancel"
                                                    ? "Payment failed. The customer may retry; this order auto-cancels after 48 hours if it remains unpaid."
                                                    : "Waiting for payment confirmation. This order auto-cancels after 48 hours if unpaid.";

                                        return (
                                            <div key={order.id} className="border rounded-3 p-3 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                        <span className="fw-bold">{order.order_number}</span>
                                                        {order.is_stale_unpaid && <span className="badge rounded-pill bg-danger-subtle text-danger">Over 48 hours unpaid</span>}
                                                        <span title="Payment status" className={"badge rounded-pill " + paymentClass(order.payment_status)}>Payment: {statusLabel(order.payment_status)}</span>
                                                        <span title="Order workflow status" className={"badge rounded-pill " + orderClass(order.order_status)}>Order: {statusLabel(order.order_status)}</span>
                                                    </div>
                                                    <div className="small text-muted">{order.customer_name} · {paymentLabel(order.payment_method)} · ₱{Number(order.total ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    <div className={"small mt-1 " + (order.is_stale_unpaid ? "text-danger fw-semibold" : "text-secondary")}>
                                                        {order.age_hours >= 24
                                                            ? "Order placed " + Math.floor(order.age_hours / 24) + " day(s) ago"
                                                            : "Order placed " + order.age_hours + " hour(s) ago"}
                                                        {" · "}{actionText}
                                                    </div>
                                                </div>
                                                <button type="button" className="btn btn-outline-primary btn-sm fw-bold flex-shrink-0" onClick={() => setViewingOrder(order)}>REVIEW ORDER</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="border rounded-3 bg-light p-4 text-center">
                                    <i className="bi bi-check-circle fs-4 text-success d-block mb-2" />
                                    <div className="fw-semibold">No unpaid orders need attention</div>
                                    <div className="small text-muted mt-1">New payment issues and pending orders will appear here.</div>
                                </div>
                            )}
                        </section>

                        <div
                            className="bg-white border rounded-3 p-3 mb-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <form
                                className="row g-2 align-items-end"
                                onSubmit={applyFilters}
                            >
                                <div className="col-lg-4">
                                    <label className="form-label small fw-semibold mb-1">
                                        SEARCH
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Order number, customer, email, phone"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        PAYMENT
                                    </label>

                                    <select
                                        className="form-select"
                                        value={paymentStatus}
                                        onChange={(event) =>
                                            setPaymentStatus(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="">All payment</option>
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="failed">Failed</option>
                                            <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        ORDER STATUS
                                    </label>

                                    <select
                                        className="form-select"
                                        value={orderStatus}
                                        onChange={(event) =>
                                            setOrderStatus(event.target.value)
                                        }
                                    >
                                        <option value="">All statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="awaiting_payment">
                                            Awaiting Payment
                                        </option>
                                        <option value="payment_failed">
                                            Payment Failed
                                        </option>
                                        <option value="processing">
                                            Processing
                                        </option>
                                        <option value="delivered">
                                            Delivered
                                        </option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        METHOD
                                    </label>

                                    <select
                                        className="form-select"
                                        value={paymentMethod}
                                        onChange={(event) =>
                                            setPaymentMethod(event.target.value)
                                        }
                                    >
                                        <option value="">All methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="gcash">GCash</option>
                                        <option value="card">Card</option>
                                        <option value="maya">Maya</option>
                                    </select>
                                </div>

                                <div className="col-6 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-6 col-lg-1 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary fw-bold"
                                        onClick={clearFilters}
                                    >
                                        CLEAR
                                    </button>
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">CREATED FROM</label>
                                    <input type="date" className="form-control" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">CREATED TO</label>
                                    <input type="date" className="form-control" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
                                </div>
                            </form>
                        </div>

                        <div
                            className="bg-white border rounded-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">ORDER</th>
                                            <th>CUSTOMER</th>
                                            <th>TOTAL</th>
                                            <th>PAYMENT</th>
                                            <th>ORDER STATUS</th>
                                            <th>DATE</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {orderRows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No purchases found.
                                                </td>
                                            </tr>
                                        ) : (
                                            orderRows.map((order) => (
                                                <tr key={order.id}>
                                                    <td className="ps-3">
                                                        <div className="fw-semibold">
                                                            {order.order_number}
                                                        </div>

                                                        <div className="small text-muted">
                                                            {order.items.length} item
                                                            {order.items.length === 1
                                                                ? ""
                                                                : "s"}
                                                        </div>
                                                        {order.invoice_record && (
                                                            <div className="small text-success mt-1">
                                                                <i className="bi bi-file-earmark-check me-1"></i>
                                                                {order.invoice_record.record_number}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {order.customer_name}
                                                        </div>

                                                        <div className="small text-muted text-break">
                                                            {order.customer_email}
                                                        </div>
                                                    </td>

                                                    <td className="fw-semibold text-primary">
                                                        ₱{Number(
                                                            order.total
                                                        ).toLocaleString()}
                                                    </td>

                                                    <td>
                                                        <div className="small fw-semibold">
                                                            {paymentLabel(
                                                                order.payment_method
                                                            )}
                                                        </div>

                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-2 py-1 " +
                                                                paymentClass(
                                                                    order.payment_status
                                                                )
                                                            }
                                                        >
                                                            {statusLabel(
                                                                order.payment_status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-2 py-1 " +
                                                                orderClass(
                                                                    order.order_status
                                                                )
                                                            }
                                                        >
                                                            {statusLabel(
                                                                order.order_status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="small">
                                                            {order.created_at
                                                                ?.split(" ")
                                                                .slice(0, 3)
                                                                .join(" ")}
                                                        </div>

                                                        <div className="small text-muted">
                                                            {order.created_at
                                                                ?.split(" ")
                                                                .slice(-2)
                                                                .join(" ")}
                                                        </div>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm fw-bold"
                                                            onClick={() =>
                                                                setViewingOrder(
                                                                    order
                                                                )
                                                            }
                                                        >
                                                            VIEW
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={orders} label="orders" insideCard />
                        </div>
                    </main>
                </div>
            </div>

            {viewingOrder && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.42)",
                        zIndex: 2000,
                        padding: "1rem",
                    }}
                    onClick={() => setViewingOrder(null)}
                >
                    <div
                        className="bg-white rounded-4 border p-3"
                        style={{
                            width: "100%",
                            maxWidth: "620px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div className="small text-primary fw-bold">
                                    {viewingOrder.order_number}
                                </div>

                                <h4
                                    className="fw-bold mb-0"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    ORDER DETAILS
                                </h4>
                            </div>

                            <button
                                type="button"
                                className="btn btn-link btn-sm text-primary text-decoration-none"
                                onClick={() => setViewingOrder(null)}
                            >
                                Back
                            </button>
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        CUSTOMER
                                    </div>

                                    <div className="fw-semibold">
                                        {viewingOrder.customer_name}
                                    </div>

                                    <div className="small text-muted text-break">
                                        {viewingOrder.customer_email}
                                    </div>

                                    <div className="small">
                                        {viewingOrder.customer_phone}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        DELIVERY ADDRESS
                                    </div>

                                    <div className="fw-semibold">
                                        {viewingOrder.delivery_address}
                                    </div>
                                    {viewingOrder.delivery_latitude != null && viewingOrder.delivery_longitude != null && (
                                        <a
                                            className="d-inline-flex align-items-center gap-2 small text-primary text-decoration-none mt-2"
                                            href={`https://www.openstreetmap.org/?mlat=${viewingOrder.delivery_latitude}&mlon=${viewingOrder.delivery_longitude}#map=18/${viewingOrder.delivery_latitude}/${viewingOrder.delivery_longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <i className="bi bi-geo-alt-fill" aria-hidden="true"></i>
                                            View delivery pin on OpenStreetMap
                                            <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="fw-bold">
                                    ITEMS
                                </div>

                                <div className="d-flex gap-2">
                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-2 py-1 " +
                                            paymentClass(
                                                viewingOrder.payment_status
                                            )
                                        }
                                    >
                                        {statusLabel(
                                            viewingOrder.payment_status
                                        )}
                                    </span>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-2 py-1 " +
                                            orderClass(
                                                viewingOrder.order_status
                                            )
                                        }
                                    >
                                        {statusLabel(
                                            viewingOrder.order_status
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                {viewingOrder.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="d-flex justify-content-between gap-3 border-bottom pb-2"
                                    >
                                        <div>
                                            <div className="fw-semibold">
                                                {item.name}
                                            </div>

                                            <div className="small text-muted">
                                                {item.quantity} × ₱
                                                {Number(
                                                    item.price
                                                ).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="fw-semibold">
                                            ₱{Number(
                                                item.subtotal
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="fw-bold mb-3">ORDER & PAYMENT TIMELINE</div>
                            {viewingOrder.timeline?.length ? (
                                <div className="d-flex flex-column gap-3">
                                    {viewingOrder.timeline.map((event) => (
                                        <div key={event.id} className="d-flex gap-3">
                                            <div className="d-flex flex-column align-items-center">
                                                <span className="rounded-circle bg-primary" style={{ width: "10px", height: "10px", marginTop: "5px" }} />
                                                <span className="flex-grow-1 border-start" />
                                            </div>
                                            <div className="flex-grow-1 pb-1">
                                                <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                                                    <span className="fw-semibold">{event.title}</span>
                                                    <span className="small text-muted">{event.created_at}</span>
                                                </div>
                                                {event.description && (
                                                    <div className="small text-muted mt-1">{event.description}</div>
                                                )}
                                                <div className="small text-muted mt-1">Recorded by {event.actor_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="small text-muted">
                                    No earlier event history is available for this order. SecureView cannot reconstruct status changes that happened before timeline logging was enabled.
                                </div>
                            )}
                        </div>

                        <div className="border rounded-3 p-3">
                            <div className="d-flex justify-content-between">
                                <span className="small text-muted">
                                    SUBTOTAL
                                </span>

                                <span>
                                    ₱{Number(
                                        viewingOrder.subtotal
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="d-flex justify-content-between mt-1">
                                <span className="small text-muted">
                                    SHIPPING
                                </span>

                                <span>
                                    ₱{Number(
                                        viewingOrder.shipping_fee
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="d-flex justify-content-between border-top mt-2 pt-2">
                                <span className="fw-bold">
                                    TOTAL
                                </span>

                                <span className="fw-bold text-primary">
                                    ₱{Number(
                                        viewingOrder.total
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="small text-muted mt-3">
                                PAYMENT METHOD:{" "}
                                {paymentLabel(viewingOrder.payment_method)}
                            </div>

                            {viewingOrder.paid_at && (
                                <div className="small text-muted mt-1">
                                    PAID AT: {viewingOrder.paid_at}
                                </div>
                            )}

                            {viewingOrder.notes && (
                                <div className="small text-muted mt-1">
                                    NOTES: {viewingOrder.notes}
                                </div>
                            )}
                        </div>

                        {viewingOrder.order_status === "payment_failed" && (
                            <div className="alert alert-warning small mt-3 mb-0">
                                Payment failed. The customer can retry from their own Purchases page. Cancel this order if they no longer want to proceed.
                            </div>
                        )}

                        {viewingOrder.is_stale_unpaid && (
                            <div className="alert alert-danger small mt-3 mb-0">
                                This unpaid order has not been updated for over 24 hours. Verify the current payment state before cancelling; do not cancel if payment is still pending at the provider.
                            </div>
                        )}

                        {viewingOrder.cancellation_reason && (
                            <div className="border rounded-3 bg-light p-3 mt-3">
                                <div className="small text-muted fw-bold mb-1">CANCELLATION REASON</div>
                                <div className="small">{viewingOrder.cancellation_reason}</div>
                            </div>
                        )}

                        {props.errors?.invoice && (
                            <div className="alert alert-danger small mt-3 mb-0">{props.errors.invoice}</div>
                        )}

                        {!viewingOrder.invoice_record && !viewingOrder.can_record_invoice && (
                            <div className="alert alert-secondary small mt-3 mb-0">
                                An internal invoice record is available after payment is confirmed, the order is Processing or Completed, and the seller profile is complete in Invoice Settings.
                            </div>
                        )}

                        {viewingOrder.invoice_record && (
                            <div className="alert alert-info small mt-3 mb-0">
                                <div className="fw-bold">Saved internal invoice record</div>
                                <div>{viewingOrder.invoice_record.record_number}</div>
                                <div className="text-muted">Saved {viewingOrder.invoice_record.issued_at}. The saved invoice page uses this frozen snapshot.</div>
                            </div>
                        )}

                        <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mt-3">
                            <div className="d-flex flex-wrap gap-2">
                                <a
                                    href={"/admin/purchases/" + viewingOrder.id + "/invoice"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline-primary fw-bold"
                                >
                                    <i className="bi bi-receipt me-2"></i>{viewingOrder.invoice_record ? "VIEW SAVED INVOICE" : "VIEW INVOICE"}
                                </a>
                                {viewingOrder.can_record_invoice && (
                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold"
                                        onClick={() => recordInvoice(viewingOrder)}
                                        disabled={recordingInvoiceId === viewingOrder.id || cancellingOrderId === viewingOrder.id || updatingOrderId === viewingOrder.id}
                                    >
                                        <i className="bi bi-file-earmark-check me-2"></i>
                                        {recordingInvoiceId === viewingOrder.id ? "SAVING RECORD..." : "SAVE INTERNAL INVOICE RECORD"}
                                    </button>
                                )}
                                {viewingOrder.can_confirm_cash_payment && (
                                    <button
                                        type="button"
                                        className="btn btn-success fw-bold"
                                        onClick={() => runOrderAction(viewingOrder, "confirm-cash-payment")}
                                        disabled={updatingOrderId === viewingOrder.id || cancellingOrderId === viewingOrder.id}
                                    >
                                        {updatingOrderId === viewingOrder.id ? "UPDATING..." : "CONFIRM CASH RECEIVED"}
                                    </button>
                                )}

                                {viewingOrder.can_mark_completed && (
                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold"
                                        onClick={() => runOrderAction(viewingOrder, "complete")}
                                        disabled={updatingOrderId === viewingOrder.id || cancellingOrderId === viewingOrder.id}
                                    >
                                        {updatingOrderId === viewingOrder.id ? "UPDATING..." : "MARK COMPLETED"}
                                    </button>
                                )}

                                {viewingOrder.can_cancel && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger fw-bold"
                                        onClick={() => cancelOrder(viewingOrder)}
                                        disabled={cancellingOrderId === viewingOrder.id || updatingOrderId === viewingOrder.id}
                                    >
                                        {cancellingOrderId === viewingOrder.id ? "CANCELLING..." : "CANCEL UNPAID ORDER"}
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-primary fw-bold"
                                onClick={() => setViewingOrder(null)}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
