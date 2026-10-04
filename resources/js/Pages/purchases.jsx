import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

function formatPaymentMethod(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    return "Cash";
}

function statusClass(status) {
    if (status === "paid" || status === "delivered") return "bg-success-subtle text-success";
    if (status === "failed" || status === "cancelled" || status === "payment_failed") return "bg-danger-subtle text-danger";
    if (status === "awaiting_payment") return "bg-warning-subtle text-warning-emphasis";
    return "bg-primary-subtle text-primary";
}

export default function Purchases({ orders = [] }) {
    const { props } = usePage();
    const [payingOrderId, setPayingOrderId] = useState(null);

    const payNow = (order) => {
        setPayingOrderId(order.id);

        router.post(
            `/purchases/${order.id}/pay`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setPayingOrderId(null),
            }
        );
    };

    return (
        <div>
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f7f7f8",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-4 py-md-5">
                    <div className="mb-4">
                        <div className="small text-uppercase fw-bold text-primary mb-1">
                            SecureView
                        </div>

                        <h1
                            className="fw-bold mb-1"
                            style={{
                                fontFamily: "Outfit, sans-serif",
                            }}
                        >
                            MY PURCHASES
                        </h1>

                        <p className="text-muted mb-0">
                            View your orders, payment status, and delivery
                            details.
                        </p>
                    </div>

                    {props.errors?.payment && (
                        <div className="alert alert-danger mb-4">
                            {props.errors.payment}
                        </div>
                    )}

                    {orders.length === 0 ? (
                        <div className="bg-white border rounded-4 p-5 text-center">
                            <div
                                className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    backgroundColor: "#edf5ff",
                                }}
                            >
                                <i
                                    className="bi bi-bag text-primary"
                                    style={{ fontSize: "2rem" }}
                                ></i>
                            </div>

                            <h3
                                className="fw-bold mb-2"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                                No purchases yet
                            </h3>

                            <p className="text-muted mb-4">
                                Your completed orders will appear here.
                            </p>

                            <Link
                                href="/products"
                                className="btn btn-primary fw-bold px-4"
                            >
                                BROWSE PRODUCTS
                            </Link>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-white border rounded-4 p-3 p-md-4"
                                    style={{
                                        boxShadow:
                                            "0 8px 24px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                                        <div>
                                            <div className="small text-muted">
                                                ORDER NUMBER
                                            </div>

                                            <div
                                                className="fw-bold"
                                                style={{
                                                    fontFamily:
                                                        "Outfit, sans-serif",
                                                }}
                                            >
                                                {order.order_number}
                                            </div>

                                            <div className="small text-muted mt-1">
                                                {order.created_at}
                                            </div>
                                        </div>

                                        <div className="text-md-end">
                                            <div className="small text-muted">
                                                TOTAL
                                            </div>

                                            <div className="fw-bold text-primary fs-5">
                                                ₱{Number(order.total).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column gap-2">
                                        {order.items.slice(0, 2).map((item) => (
                                            <div
                                                key={item.id}
                                                className="d-flex align-items-center gap-3 rounded-3 p-2"
                                                style={{
                                                    backgroundColor: "#fafafa",
                                                }}
                                            >
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="rounded-2"
                                                        style={{
                                                            width: "54px",
                                                            height: "54px",
                                                            objectFit: "cover",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: "54px",
                                                            height: "54px",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <i
                                                            className={
                                                                item.type ===
                                                                "package"
                                                                    ? "bi bi-box-seam text-secondary"
                                                                    : "bi bi-camera-video text-secondary"
                                                            }
                                                        ></i>
                                                    </div>
                                                )}

                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="small text-primary text-uppercase fw-bold">
                                                        {item.type}
                                                    </div>

                                                    <div className="fw-semibold text-truncate">
                                                        {item.name}
                                                    </div>

                                                    <div className="small text-muted">
                                                        {item.quantity} × ₱
                                                        {Number(
                                                            item.price
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="fw-bold small">
                                                    ₱
                                                    {Number(
                                                        item.subtotal
                                                    ).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}

                                        {order.items.length > 2 && (
                                            <div className="small text-muted">
                                                + {order.items.length - 2} more
                                                item
                                                {order.items.length - 2 === 1
                                                    ? ""
                                                    : "s"}
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex flex-wrap gap-2 mt-3">
                                        <span
                                            className={`badge rounded-pill px-3 py-2 ${statusClass(
                                                order.order_status
                                            )}`}
                                        >
                                            Order: {order.order_status.replace(
                                                /_/g,
                                                " "
                                            )}
                                        </span>

                                        <span
                                            className={`badge rounded-pill px-3 py-2 ${statusClass(
                                                order.payment_status
                                            )}`}
                                        >
                                            Payment: {order.payment_status.replace(
                                                /_/g,
                                                " "
                                            )}
                                        </span>

                                        <span className="badge rounded-pill px-3 py-2 bg-light text-dark">
                                            {formatPaymentMethod(
                                                order.payment_method
                                            )}
                                        </span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                        <span className="small text-muted">
                                            {order.items.reduce(
                                                (sum, item) =>
                                                    sum +
                                                    Number(item.quantity),
                                                0
                                            )}{" "}
                                            item
                                            {order.items.reduce(
                                                (sum, item) =>
                                                    sum +
                                                    Number(item.quantity),
                                                0
                                            ) === 1
                                                ? ""
                                                : "s"}
                                        </span>

                                        <div className="d-flex flex-wrap gap-2">
                                            {["gcash", "card", "maya"].includes(
                                                order.payment_method
                                            ) &&
                                                ["pending", "failed"].includes(
                                                    order.payment_status
                                                ) &&
                                                ["awaiting_payment", "payment_failed"].includes(
                                                    order.order_status
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary fw-bold btn-sm"
                                                        onClick={() => payNow(order)}
                                                        disabled={payingOrderId === order.id}
                                                    >
                                                        {payingOrderId === order.id
                                                            ? "OPENING..."
                                                            : "PAY NOW"}
                                                    </button>
                                                )}

                                            <Link
                                                href={`/purchases/${order.id}`}
                                                className="btn btn-outline-primary fw-bold btn-sm"
                                            >
                                                VIEW DETAILS
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
