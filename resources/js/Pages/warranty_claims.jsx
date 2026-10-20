import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import CustomerSidebar from "../Components/customerSidebar";
import AdminPagination from "../Components/Admin/AdminPagination";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "resolved") return "bg-success-subtle text-success";
    if (["rejected", "cancelled"].includes(status)) return "bg-danger-subtle text-danger";
    if (status === "submitted") return "bg-warning-subtle text-warning-emphasis";
    if (["approved", "in_service"].includes(status)) return "bg-primary-subtle text-primary";
    return "bg-info-subtle text-info-emphasis";
}

function statusLabel(status) {
    return String(status ?? "").replace(/_/g, " ");
}

export default function WarrantyClaims({ claims = [], eligibleItems = [] }) {
    const { props } = usePage();
    const [orderItemId, setOrderItemId] = useState(
        eligibleItems.length ? String(eligibleItems[0].id) : ""
    );
    const [issueDescription, setIssueDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const claimRows = claims.data ?? (Array.isArray(claims) ? claims : []);

    const submitClaim = (event) => {
        event.preventDefault();
        setSubmitting(true);
        router.post(
            "/warranty-claims",
            {
                order_item_id: orderItemId,
                issue_description: issueDescription,
            },
            {
                preserveScroll: true,
                onSuccess: () => setIssueDescription(""),
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <div>
            <Navbar />
            <main style={{ backgroundColor: "#f5f6f8", minHeight: "65vh" }}>
                <div className="container py-4">
                    <div className="row g-3 align-items-start">
                        <div className="col-lg-3">
                            <CustomerSidebar active="warranty" />
                        </div>

                        <div className="col-lg-9">
                            <div className="bg-white border rounded-3 p-3 p-md-4 mb-3">
                                <div className="small text-primary fw-bold">SECUREVIEW</div>
                                <h1 className="h3 fw-bold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                    WARRANTY CLAIMS
                                </h1>
                                <p className="text-muted mb-0">
                                    Request service for a covered product or package and follow the claim status here.
                                </p>
                            </div>

                            {props.flash?.success && (
                                <div className="alert alert-success">{props.flash.success}</div>
                            )}

                            {props.errors?.order_item_id && (
                                <div className="alert alert-danger">{props.errors.order_item_id}</div>
                            )}
                            {props.errors?.issue_description && (
                                <div className="alert alert-danger">{props.errors.issue_description}</div>
                            )}

                            <section className="bg-white border rounded-3 p-3 p-md-4 mb-3">
                                <div className="d-flex align-items-start gap-3 mb-3">
                                    <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 46, height: 46 }}>
                                        <i className="bi bi-shield-check fs-4" />
                                    </div>
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Request warranty service</h2>
                                        <p className="small text-muted mb-0">
                                            Only paid purchases with an active, recognized warranty period can be submitted.
                                        </p>
                                    </div>
                                </div>

                                {eligibleItems.length === 0 ? (
                                    <div className="border rounded-3 p-3 bg-light">
                                        <div className="fw-semibold">No eligible purchases found</div>
                                        <div className="small text-muted mt-1">
                                            Once a purchase is paid and has an active warranty, it will appear here. An item with an active claim cannot start another claim until the current one is closed.
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={submitClaim}>
                                        <div className="mb-3">
                                            <label htmlFor="warranty-order-item" className="form-label fw-semibold">
                                                PURCHASED ITEM
                                            </label>
                                            <select
                                                id="warranty-order-item"
                                                className="form-select"
                                                value={orderItemId}
                                                onChange={(event) => setOrderItemId(event.target.value)}
                                                required
                                            >
                                                {eligibleItems.map((item) => (
                                                    <option key={item.id} value={String(item.id)}>
                                                        {item.name} · {item.order_number} · {item.warranty_period}
                                                        {item.warranty_expiry_date ? " · Expires " + item.warranty_expiry_date : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            {eligibleItems.find((item) => String(item.id) === orderItemId) && (
                                                <div className="small text-muted mt-2">
                                                    Coverage starts {eligibleItems.find((item) => String(item.id) === orderItemId).warranty_start_date || "on purchase"} and expires{" "}
                                                    {eligibleItems.find((item) => String(item.id) === orderItemId).warranty_expiry_date || "according to its lifetime warranty"}.
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <label htmlFor="warranty-issue" className="form-label fw-semibold">
                                                DESCRIBE THE ISSUE
                                            </label>
                                            <textarea
                                                id="warranty-issue"
                                                className="form-control"
                                                rows="4"
                                                minLength="10"
                                                maxLength="2000"
                                                placeholder="Explain what is not working, when the issue started, and any troubleshooting already done."
                                                value={issueDescription}
                                                onChange={(event) => setIssueDescription(event.target.value)}
                                                required
                                            />
                                            <div className="small text-muted text-end mt-1">
                                                {issueDescription.length}/2000
                                            </div>
                                        </div>

                                        <button type="submit" className="btn btn-primary fw-bold" disabled={submitting || !orderItemId}>
                                            {submitting ? "SUBMITTING..." : "SUBMIT WARRANTY REQUEST"}
                                        </button>
                                    </form>
                                )}
                            </section>

                            <section className="bg-white border rounded-3">
                                <div className="p-3 p-md-4 border-bottom">
                                    <h2 className="h5 fw-bold mb-1">My warranty requests</h2>
                                    <p className="small text-muted mb-0">Review updates, service decisions, and notes from SecureView.</p>
                                </div>

                                {claimRows.length === 0 ? (
                                    <div className="text-center text-muted py-5 px-3">
                                        <i className="bi bi-clipboard-check fs-2 d-block mb-2" />
                                        You have not submitted a warranty request yet.
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column">
                                        {claimRows.map((claim) => (
                                            <article key={claim.id} className="p-3 p-md-4 border-bottom">
                                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-2 mb-2">
                                                    <div>
                                                        <div className="small text-primary fw-bold">{claim.claim_number}</div>
                                                        <h3 className="h6 fw-bold mt-1 mb-1">{claim.item_name}</h3>
                                                        <div className="small text-muted">Order {claim.order_number || "—"} · Submitted {claim.submitted_at || "—"}</div>
                                                    </div>
                                                    <span className={"badge rounded-pill text-capitalize px-3 py-2 " + statusClass(claim.status)}>
                                                        {statusLabel(claim.status)}
                                                    </span>
                                                </div>
                                                <div className="small mb-2">{claim.issue_description}</div>
                                                <div className="small text-muted">
                                                    Warranty: {claim.warranty_period || "Not specified"}
                                                    {claim.warranty_expiry_date ? " · Expires " + claim.warranty_expiry_date : ""}
                                                </div>
                                                {claim.admin_notes && (
                                                    <div className="mt-3 p-3 rounded-3 bg-light border-start border-3 border-primary">
                                                        <div className="small fw-bold mb-1">SECUREVIEW UPDATE</div>
                                                        <div className="small">{claim.admin_notes}</div>
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                        <AdminPagination pagination={claims} label="warranty claims" insideCard />
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
