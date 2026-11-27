import React from "react";

const STAGES = [
    { key: "processing", label: "Processing", icon: "bi-box-seam", description: "Netmax Trading is preparing your order." },
    { key: "out_for_delivery", label: "Out for Delivery", icon: "bi-truck", description: "The shop has marked your order as on its way." },
    { key: "delivered", label: "Delivered", icon: "bi-house-check", description: "The shop has marked your order as delivered." },
];

export default function DeliveryProgress({ order }) {
    // Only physical delivery orders get a shipment tracker.
    // Fee-only service orders, shop pickup, and walk-in sales are not shipments.
    if (order?.fulfillment_method !== "delivery" ||
        !Array.isArray(order.items) || order.items.length === 0) {
        return null;
    }

    const isCancelled = order.order_status === "cancelled";
    const isPaid = ["paid", "partially_refunded", "refunded"].includes(order.payment_status);
    const stageIndex = STAGES.findIndex((stage) => stage.key === order.order_status);
    const trackable = !isCancelled && isPaid && stageIndex >= 0;
    const latestShipmentEvent = [...(order.timeline ?? [])].reverse().find(
        (event) => event.event_key === "shipment_status_changed"
    );

    return (
        <section className="bg-white border rounded-4 p-3 p-md-4 mb-4" aria-label="Order delivery tracking"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <div className="small text-primary fw-bold text-uppercase mb-1">Order Tracking</div>
                    <h2 className="h5 fw-bold mb-1">Delivery Status</h2>
                    <p className="small text-muted mb-0">
                        Updates are entered by Netmax Trading when your shipment changes status.
                        This is not live rider GPS tracking.
                    </p>
                </div>
                <span className={"badge rounded-pill px-3 py-2 " +
                    (trackable && stageIndex === 2 ? "text-bg-success" : trackable ? "text-bg-primary" : "text-bg-secondary")}>
                    {trackable ? STAGES[stageIndex].label : isCancelled ? "Cancelled" :
                        !isPaid ? "Awaiting Payment" : order.order_status === "completed" ? "Completed" : "Awaiting Dispatch"}
                </span>
            </div>

            {trackable ? (
                <>
                    <ol className="list-unstyled row g-2 mb-2" aria-label="Delivery stages">
                        {STAGES.map((stage, index) => {
                            const reached = index <= stageIndex;
                            const current = index === stageIndex;
                            return (
                                <li key={stage.key} className="col-12 col-sm-4">
                                    <div className={"rounded-3 border p-3 h-100 " +
                                        (current ? "border-primary bg-primary-subtle" :
                                            reached ? "border-success bg-success-subtle" : "bg-body-tertiary")}
                                        aria-current={current ? "step" : undefined}>
                                        <div className="d-flex align-items-center gap-2">
                                            <i aria-hidden="true" className={"bi " +
                                                (reached ? "bi-check-circle-fill" : "bi-circle") +
                                                " " + (current ? "text-primary" : reached ? "text-success" : "text-secondary")} />
                                            <span className={"small fw-semibold " + (!reached ? "text-secondary" : "")}>
                                                {stage.label}
                                            </span>
                                        </div>
                                        {current && <div className="small mt-2">{stage.description}</div>}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    {latestShipmentEvent && (
                        <div className="small text-muted mt-3">
                            Latest delivery update: {latestShipmentEvent.title}
                            {latestShipmentEvent.created_at ? " · " + latestShipmentEvent.created_at : ""}
                        </div>
                    )}
                </>
            ) : (
                <div className="alert alert-info small mb-0" role="status">
                    {isCancelled
                        ? "This order was cancelled. No delivery is scheduled."
                        : !isPaid
                            ? "Delivery tracking will begin after your payment is confirmed. If you already paid online, please wait for PayMongo verification or contact Netmax Trading."
                            : order.order_status === "completed"
                                ? "This order has been marked Completed. Consult the order history or contact Netmax Trading for confirmation of delivery."
                                : "The shop has not yet recorded a delivery stage for this order. Check the history below for updates."}
                </div>
            )}
        </section>
    );
}
