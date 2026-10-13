export default function OrderStatusOverview({ statuses = [] }) {
    const totalOrders = statuses.reduce(
        (total, status) => total + Number(status.count ?? 0),
        0
    );

    return (
        <section className="card border rounded-3 mt-4">
            <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">Order Status Overview</h5>
                        <p className="small text-muted mb-0">
                            Track how orders are moving through the store.
                        </p>
                    </div>
                    <div
                        className="rounded-3 border bg-light px-3 py-2 text-end"
                        style={{ minWidth: "112px" }}
                    >
                        <div
                            className="small text-muted fw-semibold text-uppercase"
                            style={{ letterSpacing: "0.04em", fontSize: "0.65rem" }}
                        >
                            Total orders
                        </div>
                        <div className="fs-4 fw-bold text-dark">{totalOrders}</div>
                    </div>
                </div>

                {statuses.length === 0 ? (
                    <div className="text-center text-muted rounded-3 bg-light py-4">
                        No order status data available.
                    </div>
                ) : totalOrders === 0 ? (
                    <div className="text-center text-muted rounded-3 bg-light py-4">
                        No orders have been placed yet.
                    </div>
                ) : (
                    <div className="row g-3">
                        {statuses.map((status) => {
                            const count = Number(status.count ?? 0);
                            const percentage = totalOrders > 0
                                ? Math.round((count / totalOrders) * 100)
                                : 0;
                            const color = status.color || "secondary";

                            return (
                                <div className="col-sm-6" key={status.key}>
                                    <div
                                        className="h-100 rounded-3 p-3"
                                        style={{
                                            backgroundColor: "#fbfcfe",
                                            border: "1px solid #e6ebf2",
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-2">
                                            <div
                                                className={
                                                    "rounded-2 d-flex align-items-center justify-content-center bg-" +
                                                    color +
                                                    "-subtle text-" +
                                                    color
                                                }
                                                style={{ width: "36px", height: "36px", flexShrink: 0 }}
                                            >
                                                <i className={"bi " + status.icon} />
                                            </div>

                                            <div className="flex-grow-1 min-w-0">
                                                <div className="fw-semibold text-truncate">
                                                    {status.label}
                                                </div>
                                                <div className="small text-muted">
                                                    {status.description}
                                                </div>
                                            </div>

                                            <div className="text-end">
                                                <div className="fw-bold fs-5 lh-1">{count}</div>
                                                <div className="small text-muted">{percentage}%</div>
                                            </div>
                                        </div>

                                        <div
                                            className="progress mt-3"
                                            role="progressbar"
                                            aria-label={status.label + " share of orders"}
                                            aria-valuenow={percentage}
                                            aria-valuemin="0"
                                            aria-valuemax="100"
                                            style={{ height: "5px" }}
                                        >
                                            <div
                                                className={"progress-bar bg-" + color}
                                                style={{ width: percentage + "%" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
