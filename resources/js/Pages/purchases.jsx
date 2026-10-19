import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import CustomerSidebar from "../Components/customerSidebar";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

function formatPaymentMethod(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    return "Cash";
}

function statusClass(status) {
    if (
        status === "paid" ||
        status === "delivered" ||
        status === "completed"
    ) {
        return "bg-success-subtle text-success";
    }

    if (
        status === "failed" ||
        status === "cancelled" ||
        status === "payment_failed"
    ) {
        return "bg-danger-subtle text-danger";
    }

    if (status === "awaiting_payment") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-primary-subtle text-primary";
}

export default function Purchases({ orders = [] }) {
    const { props } = usePage();
    const [payingOrderId, setPayingOrderId] = useState(null);
    const [viewingOrder, setViewingOrder] = useState(null);

    const payNow = (order) => {
        setPayingOrderId(order.id);

        router.post(
            "/purchases/" + order.id + "/pay",
            {},
            {
                preserveScroll: true,
                onFinish: () => setPayingOrderId(null),
            }
        );
    };

    const canPay = (order) =>
        ["gcash", "card", "maya"].includes(order.payment_method) &&
        ["pending", "failed"].includes(order.payment_status) &&
        ["awaiting_payment", "payment_failed"].includes(order.order_status);

    return (
        <div>
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f5f6f8",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-4">
                    <div className="row g-3 align-items-start">
                        <div className="col-lg-3">
                            <CustomerSidebar active="purchases" />
                        </div>

                        <div className="col-lg-8">
                            <div
                                className="bg-white border rounded-3 p-3"
                                style={{
                                    boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <div className="small text-primary fw-bold">
                                            SECUREVIEW
                                        </div>

                                        <h2
                                            className="fw-bold mb-0"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "1.05rem",
                                            }}
                                        >
                                            PURCHASES
                                        </h2>
                                    </div>
                                </div>

                                {props.errors?.payment && (
                                    <div className="alert alert-danger small">
                                        {props.errors.payment}
                                    </div>
                                )}

                                {orders.length === 0 ? (
                                    <div
                                        className="border rounded-3 p-5 text-center"
                                        style={{
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <i
                                            className="bi bi-bag text-primary"
                                            style={{ fontSize: "2.5rem" }}
                                        ></i>

                                        <h5
                                            className="fw-bold mt-3"
                                            style={{
                                                fontFamily:
                                                    "Outfit, sans-serif",
                                            }}
                                        >
                                            NO PURCHASES YET
                                        </h5>

                                        <p className="small text-muted mb-3">
                                            Your order history will appear here.
                                        </p>

                                        <Link
                                            href="/products"
                                            className="btn btn-primary btn-sm fw-bold px-4"
                                        >
                                            BROWSE PRODUCTS
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {orders.map((order) => (
                                            <div
                                                key={order.id}
                                                className="border rounded-3 p-2"
                                                style={{
                                                    boxShadow:
                                                        "0 2px 6px rgba(0,0,0,0.08)",
                                                }}
                                            >
                                                <div className="row align-items-center g-2">
                                                    <div className="col-md-4">
                                                        <div className="small">
                                                            <strong>
                                                                Receipt ID:
                                                            </strong>{" "}
                                                            {
                                                                order.order_number
                                                            }
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            DATE:{" "}
                                                            {
                                                                order.created_at?.split(
                                                                    " "
                                                                )[0]
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            TIME:{" "}
                                                            {
                                                                order.created_at?.split(
                                                                    " "
                                                                )[1]
                                                            }{" "}
                                                            {
                                                                order.created_at?.split(
                                                                    " "
                                                                )[2]
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="small text-muted">
                                                            AMOUNT
                                                        </div>

                                                        <div className="fw-bold text-primary">
                                                            ₱
                                                            {Number(
                                                                order.total
                                                            ).toLocaleString()}
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            PAYMENT:{" "}
                                                            <span className="fw-semibold text-dark">
                                                                {formatPaymentMethod(
                                                                    order.payment_method
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-2">
                                                        <div className="small text-muted">
                                                            STATUS
                                                        </div>

                                                        <span
                                                            className={
                                                                "badge rounded-pill px-2 py-1 " +
                                                                statusClass(
                                                                    order.payment_status
                                                                )
                                                            }
                                                        >
                                                            {order.payment_status.replace(
                                                                /_/g,
                                                                " "
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="d-grid gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm fw-bold"
                                                                onClick={() =>
                                                                    setViewingOrder(
                                                                        order
                                                                    )
                                                                }
                                                            >
                                                                VIEW ITEMS
                                                            </button>

                                                            {canPay(order) && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm fw-bold"
                                                                    onClick={() =>
                                                                        payNow(
                                                                            order
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        payingOrderId ===
                                                                        order.id
                                                                    }
                                                                >
                                                                    {payingOrderId ===
                                                                    order.id
                                                                        ? "OPENING..."
                                                                        : "PAY NOW"}
                                                                </button>
                                                            )}

                                                            <Link
                                                                href={
                                                                    "/purchases/" +
                                                                    order.id
                                                                }
                                                                className="btn btn-outline-primary btn-sm fw-bold"
                                                            >
                                                                DETAILS
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="d-flex justify-content-center gap-1 mt-3">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                        disabled
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-primary rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                    >
                                        1
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                        disabled
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

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
                            maxWidth: "560px",
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
                                    ITEMS
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

                        <div className="d-flex flex-column gap-2">
                            {viewingOrder.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="border rounded-3 p-2"
                                >
                                    <div className="d-flex gap-2 align-items-center">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="rounded-2"
                                                style={{
                                                    width: "70px",
                                                    height: "70px",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                style={{
                                                    width: "70px",
                                                    height: "70px",
                                                }}
                                            >
                                                <i className="bi bi-camera-video text-secondary"></i>
                                            </div>
                                        )}

                                        <div className="flex-grow-1">
                                            <div className="small text-primary text-uppercase fw-bold">
                                                {item.type}
                                            </div>

                                            <div className="fw-bold">
                                                {item.name}
                                            </div>

                                            <div className="small text-muted">
                                                Amount: {item.quantity}x
                                            </div>

                                            <div className="text-primary fw-semibold small">
                                                ₱
                                                {Number(
                                                    item.price
                                                ).toLocaleString()}
                                            </div>
                                        </div>

                                        <Link
                                            href={
                                                item.type === "package"
                                                    ? "/packages"
                                                    : "/products"
                                            }
                                            className="btn btn-primary btn-sm fw-bold"
                                            onClick={() =>
                                                setViewingOrder(null)
                                            }
                                        >
                                            DETAILS
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                            <span className="small text-muted">
                                {viewingOrder.items.length} item
                                {viewingOrder.items.length === 1 ? "" : "s"}
                            </span>

                            <span className="fw-bold text-primary">
                                TOTAL: ₱
                                {Number(
                                    viewingOrder.total
                                ).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
