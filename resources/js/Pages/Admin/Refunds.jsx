import Navbar from "../../Components/navbar";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "failed" || status === "rejected") return "bg-danger-subtle text-danger";
    if (status === "pending" || status === "approved" || status === "processing") return "bg-warning-subtle text-warning-emphasis";
    return "bg-secondary-subtle text-secondary";
}

function money(value) {
    return "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminRefunds({ refunds = {}, filters = {}, summary = {} }) {
    const { props } = usePage();
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [source, setSource] = useState(filters.source ?? "");
    const [busyId, setBusyId] = useState(null);
    const rows = refunds.data ?? [];

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/admin/refunds", { search, status, source }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const approve = (refund) => {
        const rawAmount = window.prompt(
            "Enter the amount to approve for refund #" + refund.id + ". You may approve less than the requested amount.",
            String(refund.amount_requested)
        );
        if (rawAmount === null) return;
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            window.alert("Enter a valid refund amount greater than zero.");
            return;
        }
        const notes = window.prompt("Optional internal admin note:", "") ?? "";
        if (!window.confirm("Approve " + money(amount) + " for order " + refund.order_number + "?")) return;

        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/approve", {
            approved_amount: amount,
            admin_notes: notes,
        }, { preserveScroll: true, onFinish: () => setBusyId(null) });
    };

    const reject = (refund) => {
        const reason = window.prompt("Enter the reason for rejecting refund #" + refund.id + " (at least 5 characters).");
        if (reason === null) return;
        if (reason.trim().length < 5) {
            window.alert("The rejection reason must contain at least 5 characters.");
            return;
        }
        if (!window.confirm("Reject this refund request? The customer will see the reason.")) return;

        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/reject", {
            rejection_reason: reason.trim(),
        }, { preserveScroll: true, onFinish: () => setBusyId(null) });
    };

    const completeManual = (refund) => {
        const reference = window.prompt(
            "Confirm the money has actually been returned. Enter the cash receipt, transfer reference, or other proof.",
            ""
        );
        if (reference === null) return;
        if (reference.trim().length < 5) {
            window.alert("Enter a reference or confirmation note with at least 5 characters.");
            return;
        }
        if (!window.confirm("Record this manual refund as completed? Only continue after the money has actually been returned.")) return;

        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/complete-manual", {
            reference: reference.trim(),
        }, { preserveScroll: true, onFinish: () => setBusyId(null) });
    };

    const retry = (refund) => {
        const uncertainAttempt = refund.status === "processing" && !refund.provider_refund_id;
        const message = uncertainAttempt
            ? "Retry PayMongo refund #" + refund.id + " using the original idempotency key? This is only safe within the 23-hour reconciliation window. If the earlier request succeeded, PayMongo should return its original result."
            : "PayMongo reported that refund #" + refund.id + " failed. Starting another attempt creates a new idempotency key. Confirm the failed status in the PayMongo Dashboard before continuing.";

        if (!window.confirm(message)) return;
        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/retry", {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const reconcile = (refund) => {
        const providerRefundId = window.prompt(
            "Enter the refund ID shown in the PayMongo Dashboard for this exact payment.",
            ""
        );
        if (providerRefundId === null) return;
        if (providerRefundId.trim().length < 8) {
            window.alert("Enter the complete PayMongo refund ID.");
            return;
        }
        if (!window.confirm("SecureView will retrieve this refund from PayMongo and verify its payment ID, amount, and test/live mode before linking it. No new refund will be created. Continue?")) return;

        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/reconcile", {
            provider_refund_id: providerRefundId.trim(),
        }, { preserveScroll: true, onFinish: () => setBusyId(null) });
    };

    const convertToManual = (refund) => {
        const notes = window.prompt(
            "PayMongo rejected this refund. Confirm that you checked the PayMongo Dashboard and explain why manual processing is appropriate.",
            "PayMongo refund failed; process the return manually."
        );
        if (notes === null) return;
        if (notes.trim().length < 5) {
            window.alert("Enter at least 5 characters explaining the manual-processing decision.");
            return;
        }
        if (!window.confirm("Move this refund to manual processing? An admin must still return the money and record proof before it is marked completed.")) return;

        setBusyId(refund.id);
        router.patch("/admin/refunds/" + refund.id + "/convert-to-manual", {
            notes: notes.trim(),
        }, { preserveScroll: true, onFinish: () => setBusyId(null) });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="refunds" />
                    </aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">NETMAX TRADING ADMIN</div>
                            <h1 className="fw-bold mb-1">REFUND MANAGEMENT</h1>
                            <div className="small text-muted">Review customer requests, monitor PayMongo refunds, and record manual cash returns.</div>
                        </div>

                        {props.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}
                        {Object.values(props.errors ?? {}).flat().map((error, index) => <div key={index} className="alert alert-danger py-2">{error}</div>)}

                        <div className="row g-3 mb-3">
                            {[
                                ["PENDING REVIEW", summary.pending, "text-warning-emphasis"],
                                ["PROCESSING", summary.processing, "text-primary"],
                                ["COMPLETED", summary.completed, "text-success"],
                                ["MANUAL ACTION", summary.manual_action, "text-danger"],
                                ["RECONCILIATION", summary.reconciliation_required, "text-danger"],
                            ].map(([label, value, color]) => (
                                <div className="col-6 col-xl" key={label}>
                                    <div className="bg-white border rounded-3 p-3 h-100">
                                        <div className="small text-muted">{label}</div>
                                        <div className={"h4 fw-bold mb-0 " + color}>{value ?? 0}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <section className="bg-white border rounded-3 p-3 p-lg-4">
                            <form onSubmit={applyFilters} className="row g-2 align-items-end mb-3">
                                <div className="col-lg-5">
                                    <label className="form-label small fw-semibold" htmlFor="refund-search">Search</label>
                                    <input id="refund-search" className="form-control form-control-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer, or reason" />
                                </div>
                                <div className="col-6 col-lg-3">
                                    <label className="form-label small fw-semibold" htmlFor="refund-status">Status</label>
                                    <select id="refund-status" className="form-select form-select-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                                        <option value="">All statuses</option>
                                        {["pending", "approved", "processing", "completed", "rejected", "failed", "cancelled"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
                                    </select>
                                </div>
                                <div className="col-6 col-lg-2">
                                    <label className="form-label small fw-semibold" htmlFor="refund-source">Source</label>
                                    <select id="refund-source" className="form-select form-select-sm" value={source} onChange={(event) => setSource(event.target.value)}>
                                        <option value="">All sources</option>
                                        <option value="customer_request">Customer request</option>
                                        <option value="business_cancellation">Business cancellation</option>
                                    </select>
                                </div>
                                <div className="col-lg-2 d-flex gap-2">
                                    <button type="submit" className="btn btn-primary btn-sm fw-bold flex-grow-1">FILTER</button>
                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setSearch(""); setStatus(""); setSource(""); router.get("/admin/refunds", {}, { preserveScroll: true, replace: true }); }}>CLEAR</button>
                                </div>
                            </form>

                            {rows.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-arrow-counterclockwise text-muted" style={{ fontSize: "2rem" }} />
                                    <h5 className="fw-bold mt-2">NO REFUND RECORDS</h5>
                                    <p className="small text-muted mb-0">Customer requests and automatic business refunds will appear here.</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {rows.map((refund) => (
                                        <article className="border rounded-3 p-3" key={refund.id}>
                                            <div className="d-flex flex-column flex-xl-row justify-content-between gap-3">
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                        <span className="fw-bold">Refund #{refund.id}</span>
                                                        <span className={"badge text-capitalize " + statusClass(refund.status)}>{refund.status.replace(/_/g, " ")}</span>
                                                        <span className="badge bg-light text-dark border">{refund.source === "business_cancellation" ? "Business cancellation" : "Customer request"}</span>
                                                    </div>
                                                    <div className="small text-muted">{refund.order_number} · {refund.customer_name} · {refund.customer_email}</div>
                                                    {refund.inquiry_number && <div className="small text-muted">Linked service: {refund.inquiry_number}</div>}
                                                    <div className="d-flex flex-wrap gap-3 mt-2">
                                                        <div><div className="small text-muted">Amount Requested</div><strong>{money(refund.amount_requested)}</strong></div>
                                                        {refund.amount_approved !== null && <div><div className="small text-muted">APPROVED</div><strong>{money(refund.amount_approved)}</strong></div>}
                                                        <div><div className="small text-muted">METHOD</div><strong className="text-capitalize">{refund.provider === "paymongo" ? "PayMongo" : "Manual"}</strong></div>
                                                        <div><div className="small text-muted">Date Requested</div><strong>{refund.requested_at}</strong></div>
                                                    </div>
                                                    <div className="small mt-2">{refund.reason}</div>
                                                    <details className="border rounded-3 p-3 mt-3 bg-light">
                                                        <summary className="fw-semibold small" style={{ cursor: "pointer" }}>VIEW ORDER & INVOICE DETAILS</summary>
                                                        <div className="row g-3 mt-1">
                                                            <div className="col-md-6">
                                                                <div className="small text-muted">ORDER</div>
                                                                <div className="fw-semibold">{refund.order_number || "—"}</div>
                                                                <div className="small text-muted">Placed: {refund.order_created_at || "—"}</div>
                                                                <div className="small text-muted">Status: <span className="text-capitalize">{String(refund.order_status || "—").replace(/_/g, " ")}</span></div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="small text-muted">PAYMENT</div>
                                                                <div className="fw-semibold text-capitalize">{refund.order_payment_method || "—"} · {String(refund.order_payment_status || "—").replace(/_/g, " ")}</div>
                                                                <div className="small">Order total: <strong>{money(refund.order_total)}</strong></div>
                                                                <div className="small">Subtotal: {money(refund.order_subtotal)} · Discount: {money(refund.order_discount)} · Shipping: {money(refund.order_shipping_fee)}</div>
                                                            </div>
                                                            <div className="col-12">
                                                                <div className="small text-muted mb-1">PURCHASED ITEMS</div>
                                                                {(refund.order_items || []).length ? (
                                                                    <div className="table-responsive">
                                                                        <table className="table table-sm align-middle mb-0">
                                                                            <thead><tr><th>Item</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Subtotal</th></tr></thead>
                                                                            <tbody>{refund.order_items.map((item, index) => <tr key={index}><td>{item.name}{item.warranty_period && <div className="small text-muted">Warranty: {item.warranty_period}</div>}</td><td className="text-end">{item.quantity}</td><td className="text-end">{money(item.price)}</td><td className="text-end">{money(item.subtotal)}</td></tr>)}</tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : <div className="small text-muted">No item lines are attached to this order.</div>}
                                                            </div>
                                                            <div className="col-12">
                                                                <div className="small text-muted">INVOICE</div>
                                                                {refund.invoice_record_number ? <div className="small mb-2">Invoice {refund.invoice_record_number} · Issued {refund.invoice_issued_at || "—"}</div> : <div className="small text-muted mb-2">No issued invoice record is attached yet. The order invoice can still be opened below.</div>}
                                                                {refund.invoice_url && <a href={refund.invoice_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">OPEN ORDER INVOICE</a>}
                                                            </div>
                                                            <div className="col-12"><div className="small text-muted">{refund.order_fulfillment_method === "pickup" ? "FULFILLMENT" : "DELIVERY ADDRESS"}</div><div className="small">{refund.order_fulfillment_method === "pickup" ? "Shop pickup at Netmax Trading" : (refund.order_address || "—")}</div></div>
                                                        </div>
                                                    </details>
                                                    {refund.admin_notes && <div className="small text-muted mt-1">Admin notes: {refund.admin_notes}</div>}
                                                    {refund.rejection_reason && <div className="small text-danger mt-1">Rejection reason: {refund.rejection_reason}</div>}
                                                    {refund.provider_refund_id && <div className="small text-muted mt-1">PayMongo refund ID: {refund.provider_refund_id}</div>}
                                                    {refund.provider_error && <div className="alert alert-warning py-2 small mt-2 mb-0">{refund.provider_error}</div>}
                                                    {refund.requires_reconciliation && (
                                                        <div className="alert alert-danger py-2 small mt-2 mb-0">
                                                            <strong>Manual reconciliation required.</strong> PayMongo's safe idempotency retry window has expired or the original submission time is unavailable. Check the PayMongo Dashboard for the original refund before taking any further action. Do not submit a new refund or switch to manual processing until the original outcome is confirmed.
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex flex-wrap align-items-start align-content-start gap-2">
                                                    {refund.can_approve && <button type="button" className="btn btn-success btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => approve(refund)}>APPROVE</button>}
                                                    {refund.can_reject && <button type="button" className="btn btn-outline-danger btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => reject(refund)}>REJECT</button>}
                                                    {refund.can_complete_manual && <button type="button" className="btn btn-primary btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => completeManual(refund)}>RECORD MONEY RETURNED</button>}
                                                    {refund.can_retry && <button type="button" className="btn btn-outline-warning btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => retry(refund)}>VERIFY / RETRY REFUND</button>}
                                                    {refund.can_reconcile && <button type="button" className="btn btn-outline-primary btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => reconcile(refund)}>RECONCILE PAYMONGO ID</button>}
                                                    {refund.can_convert_to_manual && <button type="button" className="btn btn-outline-secondary btn-sm fw-bold" disabled={busyId === refund.id} onClick={() => convertToManual(refund)}>SWITCH TO MANUAL</button>}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                            <AdminPagination pagination={refunds} label="refunds" />
                        </section>
                        <div className="alert alert-info small mt-3 mb-0">
                            A PayMongo “succeeded” status means the refund was sent to the payment partner; the customer's bank or wallet may take additional time to display it. Manual refunds must only be marked completed after the money has actually been returned.
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
