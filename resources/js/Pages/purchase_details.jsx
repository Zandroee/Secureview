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
    if (status === "paid" || status === "delivered" || status === "refunded") return "bg-success-subtle text-success";
    if (status === "partially_refunded") return "bg-info-subtle text-info-emphasis";
    if (status === "failed" || status === "cancelled" || status === "payment_failed") return "bg-danger-subtle text-danger";
    if (status === "awaiting_payment") return "bg-warning-subtle text-warning-emphasis";
    return "bg-primary-subtle text-primary";
}

export default function PurchaseDetails({ order }) {
    const { props } = usePage();
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [refundAmount, setRefundAmount] = useState(String(order.refundable_remaining ?? ""));
    const [refundReason, setRefundReason] = useState("");
    const [requestingRefund, setRequestingRefund] = useState(false);

    const submitRefundRequest = (event) => {
        event.preventDefault();
        if (!window.confirm("Submit this refund request for admin review? Submitting a request does not mean the refund is approved.")) return;

        setRequestingRefund(true);
        router.post(
            "/purchases/" + order.id + "/refunds",
            { amount: refundAmount, reason: refundReason },
            {
                preserveScroll: true,
                onSuccess: () => setRefundReason(""),
                onFinish: () => setRequestingRefund(false),
            }
        );
    };

    const payNow = () => {
        setPaying(true);

        router.post(
            `/purchases/${order.id}/pay`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setPaying(false),
            }
        );
    };

    const canPay =
        ["gcash", "card", "maya"].includes(order.payment_method) &&
        ["pending", "failed"].includes(order.payment_status) &&
        ["awaiting_payment", "payment_failed"].includes(order.order_status);

    const cancelOrder = () => {
        const enteredReason = window.prompt(
            "Why are you cancelling order " + order.order_number + "? Leave blank to record 'Cancelled by customer.'",
            "Changed my mind"
        );

        if (enteredReason === null) return;

        const reason = enteredReason.trim() || "Cancelled by customer.";
        if (reason.length < 5) {
            window.alert("Please enter at least 5 characters for the cancellation reason.");
            return;
        }

        if (!window.confirm(
            "Cancel unpaid order " + order.order_number + "? This cannot be undone. Paid orders cannot be cancelled here.\n\nReason: " + reason
        )) {
            return;
        }

        setCancelling(true);
        router.patch(
            "/purchases/" + order.id + "/cancel",
            { reason },
            {
                preserveScroll: true,
                onFinish: () => setCancelling(false),
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
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                            <div className="small text-uppercase fw-bold text-primary mb-1">
                                Netmax Trading
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

                        <div className="d-flex flex-wrap gap-2">
                            <Link
                                href={"/purchases/" + order.id + "/invoice"}
                                className="btn btn-primary fw-bold"
                            >
                                <i className="bi bi-receipt me-2"></i>VIEW INVOICE
                            </Link>
                            <Link
                                href="/purchases"
                                className="btn btn-outline-primary fw-bold"
                            >
                                BACK TO PURCHASES
                            </Link>
                        </div>
                    </div>

                    {props.flash?.success && (
                        <div className="alert alert-success mb-4">{props.flash.success}</div>
                    )}

                    {props.errors?.payment && (
                        <div className="alert alert-danger mb-4">
                            {props.errors.payment}
                        </div>
                    )}

                    {props.errors?.order && (
                        <div className="alert alert-danger mb-4">{props.errors.order}</div>
                    )}

                    {props.errors?.review && (
                        <div className="alert alert-danger mb-4">{props.errors.review}</div>
                    )}

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
                                                <div className="small text-muted mt-1">
                                                    Warranty: {item.warranty_period || "Not specified"}
                                                </div>
                                                {order.payment_status === "paid" &&
                                                    order.order_status !== "cancelled" &&
                                                    item.purchasable_id &&
                                                    item.can_review && (
                                                        <div className="mt-2">
                                                            <Link
                                                                href={`/purchases/${order.id}/items/${item.id}/review`}
                                                                className="btn btn-outline-primary btn-sm"
                                                            >
                                                                <i className="bi bi-star me-1"></i>
                                                                Review &amp; rating
                                                            </Link>
                                                        </div>
                                                    )}
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

                            {order.service_booking && (
                                <div className="bg-white border rounded-4 p-3 p-md-4 mb-4">
                                    <div className="small text-primary fw-bold">SERVICE BOOKING</div>
                                    <div className="fw-semibold">{order.service_booking.service_type} · {order.service_booking.inquiry_number}</div>
                                    <div className="small text-muted text-capitalize mt-1">Status: {order.service_booking.status.replace(/_/g, " ")}</div>
                                    <div className="small text-muted">Preferred schedule: {order.service_booking.preferred_date || "To be arranged"} · {order.service_booking.preferred_time || "Flexible"}</div>
                                    <Link href={order.service_booking.url} className="btn btn-outline-primary btn-sm mt-2">VIEW SERVICE DETAILS</Link>
                                </div>
                            )}

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
                                            {order.fulfillment_method === "pickup" ? "FULFILLMENT" : "DELIVERY ADDRESS"}
                                        </div>
                                        <div className="fw-semibold">
                                            {order.fulfillment_method === "pickup" ? "Shop pickup at Netmax Trading" : order.delivery_address}
                                        </div>
                                        {order.delivery_latitude != null && order.delivery_longitude != null && (
                                            <a
                                                className="d-inline-flex align-items-center gap-2 small text-primary text-decoration-none mt-2"
                                                href={`https://www.openstreetmap.org/?mlat=${order.delivery_latitude}&mlon=${order.delivery_longitude}#map=18/${order.delivery_latitude}/${order.delivery_longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <i className="bi bi-geo-alt-fill" aria-hidden="true"></i>
                                                View delivery pin on OpenStreetMap
                                                <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                                            </a>
                                        )}
                                    </div>

                                    {order.cancellation_reason && (
                                        <div className="col-12">
                                            <div className="small text-muted mb-1">CANCELLATION REASON</div>
                                            <div className="fw-semibold">{order.cancellation_reason}</div>
                                        </div>
                                    )}

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
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 mt-4"
                                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}
                            >
                                <div className="d-flex flex-column flex-sm-row justify-content-between gap-1 mb-3">
                                    <div>
                                        <h4 className="fw-bold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            REFUND REQUESTS
                                        </h4>
                                        <div className="small text-muted">
                                            Refunded: ₱{Number(order.refunded_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            {" · "}
                                            Remaining refundable: ₱{Number(order.refundable_remaining ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {props.flash?.success && (
                                    <div className="alert alert-success py-2 small">{props.flash.success}</div>
                                )}
                                {props.errors?.refund && <div className="alert alert-danger py-2 small">{props.errors.refund}</div>}
                                {props.errors?.amount && <div className="alert alert-danger py-2 small">{props.errors.amount}</div>}
                                {props.errors?.reason && <div className="alert alert-danger py-2 small">{props.errors.reason}</div>}

                                {order.can_request_refund && Number(order.refundable_remaining) > 0 && (
                                    <form onSubmit={submitRefundRequest} className="border rounded-3 p-3 mb-3">
                                        <div className="small text-muted mb-2">
                                            Request a full or partial refund. Netmax Trading will review the reason before approving customer-requested refunds.
                                        </div>
                                        <div className="row g-2">
                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold" htmlFor="refund-amount">Requested amount (PHP)</label>
                                                <input
                                                    id="refund-amount"
                                                    type="number"
                                                    className="form-control"
                                                    min="1.00"
                                                    max={Number(order.refundable_remaining)}
                                                    step="0.01"
                                                    value={refundAmount}
                                                    onChange={(event) => setRefundAmount(event.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label small fw-semibold" htmlFor="refund-reason">Reason for refund</label>
                                                <textarea
                                                    id="refund-reason"
                                                    className="form-control"
                                                    rows="2"
                                                    minLength="5"
                                                    maxLength="1000"
                                                    value={refundReason}
                                                    onChange={(event) => setRefundReason(event.target.value)}
                                                    placeholder="Explain what happened and why you are requesting a refund."
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-outline-primary btn-sm fw-bold mt-3" disabled={requestingRefund}>
                                            {requestingRefund ? "SUBMITTING..." : "SUBMIT REFUND REQUEST"}
                                        </button>
                                    </form>
                                )}

                                {order.refunds?.length ? (
                                    <div className="d-flex flex-column gap-2 mb-3">
                                        {order.refunds.map((refund) => (
                                            <div key={refund.id} className="border rounded-3 p-3">
                                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                    <div className="fw-semibold">Refund #{refund.id}</div>
                                                    <span className={"badge text-capitalize " + (refund.status === "completed" ? "bg-success-subtle text-success" : refund.status === "rejected" || refund.status === "failed" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning-emphasis")}>
                                                        {refund.status.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <div className="small text-muted mt-1">
                                                    Requested ₱{Number(refund.amount_requested).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {refund.amount_approved !== null && " · Approved ₱" + Number(refund.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {" · "}{refund.source === "business_cancellation" ? "Business cancellation" : "Customer request"}
                                                    {" · "}{refund.created_at}
                                                </div>
                                                <div className="small mt-2">{refund.reason}</div>
                                                {refund.rejection_reason && <div className="small text-danger mt-1">Decision: {refund.rejection_reason}</div>}
                                                {refund.completed_at && <div className="small text-success mt-1">Completed: {refund.completed_at}</div>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="small text-muted mb-3">There are no refund requests for this order.</div>
                                )}
                            </div>

                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 mt-4"
                                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}
                            >
                                <div className="d-flex flex-column flex-sm-row justify-content-between gap-1 mb-3">
                                    <h4 className="fw-bold mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                                        ORDER & PAYMENT HISTORY
                                    </h4>
                                    <span className="small text-muted">Payment and order changes recorded by Netmax Trading.</span>
                                </div>
                                {order.timeline?.length ? (
                                    <div className="d-flex flex-column gap-3">
                                        {[...order.timeline].reverse().map((event) => (
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
                                                    <div className="small text-muted mt-1">Recorded by {event.actor_label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="small text-muted">
                                        Event history begins when Netmax Trading records new order activity. Earlier status changes cannot be reconstructed for older orders.
                                    </div>
                                )}
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

                                {canPay && (
                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold w-100 mb-3"
                                        onClick={payNow}
                                        disabled={paying || cancelling}
                                    >
                                        {paying ? "OPENING PAYMENT..." : "PAY NOW"}
                                    </button>
                                )}

                                {order.can_cancel && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger fw-bold w-100 mb-3"
                                        onClick={cancelOrder}
                                        disabled={paying || cancelling}
                                    >
                                        {cancelling ? "CANCELLING ORDER..." : "CANCEL UNPAID ORDER"}
                                    </button>
                                )}

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
                                        ₱{Number(order.subtotal).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {Number(order.discount_amount ?? 0) > 0 && (
                                    <div className="d-flex justify-content-between mb-2 text-success">
                                        <span className="text-muted">Voucher discount{order.voucher_code ? " (" + order.voucher_code + ")" : ""}</span>
                                        <span className="fw-semibold">−₱{Number(order.discount_amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}

                                {Number(order.installation_fee ?? 0) > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Installation Fee</span>
                                        <span className="fw-semibold">
                                            ₱{Number(order.installation_fee).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                {Number(order.service_priority_fee ?? 0) > 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Urgent / Emergency Booking Fee</span>
                                        <span className="fw-semibold">
                                            ₱{Number(order.service_priority_fee).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

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
                                            ? "Cash payment is still marked pending until Netmax Trading confirms it. Delivery tracking is not currently available in the site."
                                            : "Online payment is confirmed only after PayMongo reports a successful payment."}
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
