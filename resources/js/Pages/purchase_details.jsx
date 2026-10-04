import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link } from "@inertiajs/react";

function formatPaymentMethod(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    return "Cash";
}

function statusClass(status) {
    if (status === "paid" || status === "delivered") return "bg-success-subtle text-success";
    if (status === "failed" || status === "cancelled") return "bg-danger-subtle text-danger";
    if (status === "awaiting_payment") return "bg-warning-subtle text-warning-emphasis";
    return "bg-primary-subtle text-primary";
}

export default function PurchaseDetails({ order }) {
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
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                            <div className="small text-uppercase fw-bold text-primary mb-1">
                                SecureView
                            </div>

                            <h1
                                className="fw-bold mb-1"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                }}
                            >
                                ORDER DETAILS
                            </h1>

                            <div className="text-muted">
                                {order.order_number} · {order.created_at}
                            </div>
                        </div>

                        <Link
                            href="/purchases"
                            className="btn btn-outline-primary fw-bold"
                        >
                            BACK TO PURCHASES
                        </Link>
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-8">
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 mb-4"
                                style={{
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4
                                        className="fw-bold mb-0"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        ITEMS
                                    </h4>

                                    <span className="small text-muted">
                                        {order.items.reduce(
                                            (sum, item) =>
                                                sum + Number(item.quantity),
                                            0
                                        )}{" "}
                                        item
                                        {order.items.reduce(
                                            (sum, item) =>
                                                sum + Number(item.quantity),
                                            0
                                        ) === 1
                                            ? ""
                                            : "s"}
                                    </span>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    {order.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="d-flex gap-3 align-items-center border rounded-3 p-3"
                                        >
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="rounded-3"
                                                    style={{
                                                        width: "72px",
                                                        height: "72px",
                                                        objectFit: "cover",
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-3 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: "72px",
                                                        height: "72px",
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
                                                        style={{
                                                            fontSize: "1.5rem",
                                                        }}
                                                    ></i>
                                                </div>
                                            )}

                                            <div className="flex-grow-1">
                                                <div className="small text-uppercase fw-bold text-primary">
                                                    {item.type}
                                                </div>

                                                <div
                                                    className="fw-bold"
                                                    style={{
                                                        fontFamily:
                                                            "Outfit, sans-serif",
                                                    }}
                                                >
                                                    {item.name}
                                                </div>

                                                <div className="small text-muted mt-1">
                                                    {item.quantity} × ₱
                                                    {Number(
                                                        item.price
                                                    ).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="fw-bold text-end">
                                                ₱
                                                {Number(
                                                    item.subtotal
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div
                                className="bg-white border rounded-4 p-3 p-md-4"
                                style={{
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <h4
                                    className="fw-bold mb-4"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    DELIVERY INFORMATION
                                </h4>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="small text-muted mb-1">
                                            FULL NAME
                                        </div>
                                        <div className="fw-semibold">
                                            {order.customer_name}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="small text-muted mb-1">
                                            PHONE
                                        </div>
                                        <div className="fw-semibold">
                                            {order.customer_phone}
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="small text-muted mb-1">
                                            EMAIL
                                        </div>
                                        <div className="fw-semibold">
                                            {order.customer_email}
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="small text-muted mb-1">
                                            DELIVERY ADDRESS
                                        </div>
                                        <div className="fw-semibold">
                                            {order.delivery_address}
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div className="col-12">
                                            <div className="small text-muted mb-1">
                                                NOTES
                                            </div>
                                            <div className="fw-semibold">
                                                {order.notes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 sticky-lg-top"
                                style={{
                                    top: "20px",
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <h4
                                    className="fw-bold mb-4"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    ORDER SUMMARY
                                </h4>

                                <div className="d-flex flex-wrap gap-2 mb-4">
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
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Payment Method
                                    </span>
                                    <span className="fw-semibold">
                                        {formatPaymentMethod(
                                            order.payment_method
                                        )}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Subtotal
                                    </span>
                                    <span className="fw-semibold">
                                        ₱{Number(order.subtotal).toLocaleString()}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">
                                        Shipping
                                    </span>
                                    <span className="fw-semibold">
                                        {Number(order.shipping_fee) === 0
                                            ? "FREE"
                                            : "₱" +
                                              Number(
                                                  order.shipping_fee
                                              ).toLocaleString()}
                                    </span>
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold">TOTAL</span>
                                    <span className="text-primary fw-bold fs-4">
                                        ₱{Number(order.total).toLocaleString()}
                                    </span>
                                </div>

                                <div
                                    className="rounded-3 p-3 mt-4"
                                    style={{
                                        backgroundColor: "#eef7ff",
                                    }}
                                >
                                    <div className="fw-bold small mb-2">
                                        <i className="bi bi-info-circle text-primary me-2"></i>
                                        PAYMENT STATUS
                                    </div>

                                    <div className="small text-muted">
                                        {order.payment_method === "cash"
                                            ? "Payment is pending and will be collected on delivery."
                                            : "Online payment processing will be handled through the payment gateway."}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
