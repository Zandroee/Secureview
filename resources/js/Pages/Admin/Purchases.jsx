import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router } from "@inertiajs/react";
import { useState } from "react";

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

    if (status === "awaiting_payment") {
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
    const [viewingOrder, setViewingOrder] = useState(null);

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/purchases",
            {
                search,
                payment_status: paymentStatus,
                order_status: orderStatus,
                payment_method: paymentMethod,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setPaymentStatus("");
        setOrderStatus("");
        setPaymentMethod("");

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
                                PURCHASE HISTORY
                            </h1>

                            <div className="small text-muted">
                                Review customer orders, payment status, and order details.
                            </div>
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
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No purchases found.
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map((order) => (
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
                                                            {order.created_at?.split(
                                                                " "
                                                            )[0]}
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

                        <div className="d-flex justify-content-end mt-3">
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
