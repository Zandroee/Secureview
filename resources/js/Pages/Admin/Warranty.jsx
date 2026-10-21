import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

const STATUS_OPTIONS = [
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "in_service",
    "resolved",
    "cancelled",
];

function statusLabel(status) {
    return String(status ?? "").replace(/_/g, " ");
}

function statusClass(status) {
    if (status === "resolved") return "bg-success-subtle text-success";
    if (["rejected", "cancelled"].includes(status)) return "bg-danger-subtle text-danger";
    if (status === "submitted") return "bg-warning-subtle text-warning-emphasis";
    if (["approved", "in_service"].includes(status)) return "bg-primary-subtle text-primary";
    return "bg-info-subtle text-info-emphasis";
}

function coverageClass(status) {
    if (status === "active") return "bg-success-subtle text-success";
    if (status === "lifetime") return "bg-primary-subtle text-primary";
    if (status === "expired") return "bg-danger-subtle text-danger";
    return "bg-secondary-subtle text-secondary";
}

export default function AdminWarranty({
    claims = [],
    warranties = [],
    filters = {},
    summary = {},
    statuses = STATUS_OPTIONS,
}) {
    const { props } = usePage();
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [editingClaim, setEditingClaim] = useState(null);
    const [viewingRecord, setViewingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const rows = claims.data ?? (Array.isArray(claims) ? claims : []);
    const coverageRows = warranties.data ?? (Array.isArray(warranties) ? warranties : []);
    const latestClaimNumbers = new Set(
        coverageRows.map((warranty) => warranty.latest_claim_number).filter(Boolean)
    );
    const combinedRows = [
        ...coverageRows.map((warranty) => ({
            type: "coverage",
            key: "coverage-" + warranty.id,
            warranty,
            claim: rows.find((claim) => claim.claim_number === warranty.latest_claim_number) ?? null,
        })),
        ...rows
            .filter((claim) => !latestClaimNumbers.has(claim.claim_number))
            .map((claim) => ({
                type: "claim",
                key: "claim-" + claim.id,
                warranty: null,
                claim,
            })),
    ];

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(
            "/admin/warranty",
            { search, status },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        router.get(
            "/admin/warranty",
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const openEditor = (claim) => {
        setViewingRecord(null);
        setEditingClaim({
            ...claim,
            admin_notes: claim.admin_notes ?? "",
            status: claim.status ?? "submitted",
        });
    };

    const saveClaim = (event) => {
        event.preventDefault();
        if (!editingClaim) return;

        setSaving(true);
        router.patch(
            "/admin/warranty/" + editingClaim.id,
            {
                status: editingClaim.status,
                admin_notes: editingClaim.admin_notes,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingClaim(null),
                onFinish: () => setSaving(false),
            }
        );
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="warranty" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                                <h1 className="fw-bold mb-1">WARRANTY SERVICE</h1>
                                <p className="text-muted mb-0">Review customer claims, confirm coverage, and manage repair or resolution status.</p>
                            </div>
                            <div className="bg-white border rounded-3 px-3 py-2 text-md-end">
                                <div className="small text-muted">TOTAL CLAIMS</div>
                                <div className="h3 fw-bold mb-0">{summary.total ?? 0}</div>
                            </div>
                        </div>

                        {props.flash?.success && (
                            <div className="alert alert-success">{props.flash.success}</div>
                        )}

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">OPEN CLAIMS</div>
                                    <div className="h4 fw-bold text-primary mb-0">{summary.open ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">UNDER REVIEW</div>
                                    <div className="h4 fw-bold text-warning-emphasis mb-0">{summary.under_review ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">IN SERVICE</div>
                                    <div className="h4 fw-bold text-primary mb-0">{summary.in_service ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">RESOLVED</div>
                                    <div className="h4 fw-bold text-success mb-0">{summary.resolved ?? 0}</div>
                                </div>
                            </div>
                        </div>

                        <section className="bg-white border rounded-3 p-3 mb-3" style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.04)" }}>
                            <form className="row g-2 align-items-end" onSubmit={applyFilters}>
                                <div className="col-lg-7">
                                    <label className="form-label small fw-semibold mb-1">SEARCH CLAIMS</label>
                                    <input
                                        className="form-control"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Claim number, customer, order number, or product"
                                    />
                                </div>
                                <div className="col-sm-8 col-lg-3">
                                    <label className="form-label small fw-semibold mb-1">CLAIM STATUS</label>
                                    <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                                        <option value="">All statuses</option>
                                        {(statuses.length ? statuses : STATUS_OPTIONS).map((item) => (
                                            <option key={item} value={item}>{statusLabel(item)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-6 col-lg-1 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold">FILTER</button>
                                </div>
                                <div className="col-6 col-lg-1 d-grid">
                                    <button type="button" className="btn btn-outline-primary fw-bold" onClick={clearFilters}>CLEAR</button>
                                </div>
                            </form>
                        </section>

                        <section className="bg-white border rounded-3 overflow-hidden" style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.04)" }}>
                            <div className="p-3 p-md-4 border-bottom">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Warranty Records</h2>
                                        <p className="small text-muted mb-0">Coverage and service claims together. Choose View to inspect a purchase or claim; claim updates are available inside the details view.</p>
                                    </div>
                                    <div className="small text-muted text-md-end">
                                        <div>{warranties.total ?? coverageRows.length} purchase records</div>
                                        <div>{claims.total ?? rows.length} service claims</div>
                                    </div>
                                </div>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">CUSTOMER / ORDER</th>
                                            <th>PURCHASED ITEM / ISSUE</th>
                                            <th>WARRANTY / COVERAGE</th>
                                            <th>CLAIM STATUS</th>
                                            <th className="text-end pe-3">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {combinedRows.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5 text-muted">
                                                    <i className="bi bi-shield-check fs-2 d-block mb-2" />
                                                    No warranty records or claims found.
                                                    <div className="small mt-1">Try adjusting the search or claim-status filters.</div>
                                                </td>
                                            </tr>
                                        ) : combinedRows.map((record) => {
                                            const warranty = record.warranty;
                                            const claim = record.claim;
                                            return (
                                                <tr key={record.key}>
                                                    <td className="ps-3">
                                                        <div className="fw-semibold">{warranty?.customer_name ?? claim?.customer_name ?? "Unknown customer"}</div>
                                                        <div className="small text-muted text-break">{warranty?.customer_email ?? claim?.customer_email ?? "—"}</div>
                                                        <div className="small text-primary mt-1">{warranty?.order_number ?? claim?.order_number ?? "—"}</div>
                                                        {record.type === "claim" && <div className="small text-muted mt-1">{claim.claim_number}</div>}
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold">{warranty?.item_name ?? claim?.item_name ?? "Purchased item"}</div>
                                                        {warranty ? (
                                                            <div className="small text-muted">Quantity: {warranty.quantity}</div>
                                                        ) : (
                                                            <>
                                                                <div className="small text-muted text-break">{claim.issue_description}</div>
                                                                <div className="small text-muted mt-1">{claim.submitted_at || "—"}</div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold">{warranty?.warranty_period ?? claim?.warranty_period ?? "Not specified"}</div>
                                                        {warranty ? (
                                                            <>
                                                                <div className="small text-muted">Started {warranty.warranty_start_date || "—"}</div>
                                                                <div className="small text-muted">
                                                                    {warranty.warranty_expiry_date
                                                                        ? "Expires " + warranty.warranty_expiry_date
                                                                        : /lifetime/i.test(warranty.warranty_period ?? "") ? "No expiration (lifetime)" : "Expiry unavailable"}
                                                                </div>
                                                                <span className={"badge rounded-pill text-capitalize px-2 py-1 mt-1 " + coverageClass(warranty.coverage_status)}>
                                                                    {statusLabel(warranty.coverage_status)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <div className="small text-muted">
                                                                {claim.warranty_expiry_date
                                                                    ? "Expires " + claim.warranty_expiry_date
                                                                    : /lifetime/i.test(claim.warranty_period ?? "") ? "Lifetime coverage" : "Expiry unavailable"}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {claim ? (
                                                            <>
                                                                {record.type === "coverage" && <div className="small fw-semibold">{claim.claim_number}</div>}
                                                                <span className={"badge rounded-pill text-capitalize px-2 py-1 " + statusClass(claim.status)}>
                                                                    {statusLabel(claim.status)}
                                                                </span>
                                                                {record.type === "claim" && claim.admin_notes && <div className="small text-muted mt-1">{claim.admin_notes}</div>}
                                                            </>
                                                        ) : warranty?.latest_claim_number ? (
                                                            <>
                                                                <div className="small fw-semibold">{warranty.latest_claim_number}</div>
                                                                <span className={"badge rounded-pill text-capitalize px-2 py-1 " + statusClass(warranty.latest_claim_status)}>
                                                                    {statusLabel(warranty.latest_claim_status)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="small text-muted">No claim submitted</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary fw-semibold"
                                                            onClick={() => setViewingRecord(record)}
                                                        >
                                                            VIEW
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="border-top">
                                <AdminPagination pagination={warranties} label="purchase records" insideCard />
                            </div>
                            {rows.length > 0 && (
                                <div className="border-top">
                                    <AdminPagination pagination={claims} label="service claims" insideCard />
                                </div>
                            )}
                        </section>

                    </main>
                </div>
            </div>
            <Footer />

            {viewingRecord && (
                <div
                    className="admin-warranty-detail-modal position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", zIndex: 2999, padding: "1rem" }}
                    onClick={() => setViewingRecord(null)}
                >
                    <div
                        className="bg-white border rounded-4 p-3 p-md-4 w-100"
                        style={{ maxWidth: "850px", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                            <div>
                                <div className="small text-primary fw-bold">
                                    {viewingRecord.type === "claim" ? viewingRecord.claim?.claim_number : viewingRecord.warranty?.order_number}
                                </div>
                                <h2 className="h5 fw-bold mb-1">
                                    {viewingRecord.type === "claim" ? "Warranty claim details" : "Warranty coverage details"}
                                </h2>
                                <div className="small text-muted">
                                    {viewingRecord.warranty?.customer_name ?? viewingRecord.claim?.customer_name ?? "Unknown customer"}
                                    {" · "}
                                    {viewingRecord.warranty?.item_name ?? viewingRecord.claim?.item_name ?? "Purchased item"}
                                </div>
                            </div>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setViewingRecord(null)} />
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <div className="border rounded-3 p-3 h-100">
                                    <div className="small text-muted mb-1">CUSTOMER / ORDER</div>
                                    <div className="fw-semibold">{viewingRecord.warranty?.customer_name ?? viewingRecord.claim?.customer_name ?? "Unknown customer"}</div>
                                    <div className="small text-muted text-break">{viewingRecord.warranty?.customer_email ?? viewingRecord.claim?.customer_email ?? "—"}</div>
                                    <div className="small text-primary mt-1">{viewingRecord.warranty?.order_number ?? viewingRecord.claim?.order_number ?? "—"}</div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="border rounded-3 p-3 h-100">
                                    <div className="small text-muted mb-1">PURCHASED ITEM</div>
                                    <div className="fw-semibold">{viewingRecord.warranty?.item_name ?? viewingRecord.claim?.item_name ?? "Purchased item"}</div>
                                    <div className="small text-muted">Quantity: {viewingRecord.warranty?.quantity ?? "—"}</div>
                                    <div className="small text-muted mt-1">
                                        Warranty: {viewingRecord.warranty?.warranty_period ?? viewingRecord.claim?.warranty_period ?? "Not specified"}
                                    </div>
                                    <div className="small text-muted">
                                        {viewingRecord.warranty?.warranty_start_date
                                            ? "Started " + viewingRecord.warranty.warranty_start_date
                                            : viewingRecord.claim?.submitted_at ? "Claim submitted " + viewingRecord.claim.submitted_at : ""}
                                    </div>
                                    <div className="small text-muted">
                                        {(viewingRecord.warranty?.warranty_expiry_date ?? viewingRecord.claim?.warranty_expiry_date)
                                            ? "Expires " + (viewingRecord.warranty?.warranty_expiry_date ?? viewingRecord.claim?.warranty_expiry_date)
                                            : /lifetime/i.test(viewingRecord.warranty?.warranty_period ?? viewingRecord.claim?.warranty_period ?? "") ? "Lifetime coverage" : "Expiry unavailable"}
                                    </div>
                                    {viewingRecord.warranty?.coverage_status && (
                                        <span className={"badge rounded-pill text-capitalize px-2 py-1 mt-2 " + coverageClass(viewingRecord.warranty.coverage_status)}>
                                            {statusLabel(viewingRecord.warranty.coverage_status)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {viewingRecord.claim ? (
                            <div className="border rounded-3 p-3 mb-3">
                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                    <div>
                                        <div className="small text-primary fw-bold">{viewingRecord.claim.claim_number}</div>
                                        <div className="small text-muted">{viewingRecord.claim.submitted_at || "—"}</div>
                                    </div>
                                    <span className={"badge rounded-pill text-capitalize px-2 py-2 " + statusClass(viewingRecord.claim.status)}>
                                        {statusLabel(viewingRecord.claim.status)}
                                    </span>
                                </div>
                                <div className="small fw-bold mb-1">CUSTOMER REPORTED ISSUE</div>
                                <div className="small mb-3" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                                    {viewingRecord.claim.issue_description || "No issue details provided."}
                                </div>
                                <div className="small fw-bold mb-1">ADMIN NOTES / CUSTOMER UPDATE</div>
                                <div className="small text-muted" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                                    {viewingRecord.claim.admin_notes || "No admin notes recorded."}
                                </div>
                            </div>
                        ) : viewingRecord.warranty?.latest_claim_number ? (
                            <div className="alert alert-info">
                                Latest claim: <strong>{viewingRecord.warranty.latest_claim_number}</strong>
                                <span className="ms-2 badge rounded-pill text-capitalize">{statusLabel(viewingRecord.warranty.latest_claim_status)}</span>
                                <div className="small mt-1">Detailed claim information is not in the currently loaded claim page. Use the search filter with this claim number to find its record.</div>
                            </div>
                        ) : (
                            <div className="alert alert-light border">
                                No warranty service claim has been submitted for this purchase.
                            </div>
                        )}

                        <div className="d-flex flex-wrap justify-content-end gap-2">
                            {viewingRecord.claim && (
                                <button type="button" className="btn btn-primary fw-semibold" onClick={() => openEditor(viewingRecord.claim)}>
                                    MANAGE CLAIM
                                </button>
                            )}
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setViewingRecord(null)}>
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingClaim && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", zIndex: 3000, padding: "1rem" }}
                    onClick={() => setEditingClaim(null)}
                >
                    <div className="bg-white rounded-4 border w-100 p-4" style={{ maxWidth: "650px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={(event) => event.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                            <div>
                                <div className="small text-primary fw-bold">{editingClaim.claim_number}</div>
                                <h2 className="h5 fw-bold mb-1">Manage warranty claim</h2>
                                <div className="small text-muted">{editingClaim.customer_name} · {editingClaim.item_name}</div>
                            </div>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditingClaim(null)} />
                        </div>

                        <div className="border rounded-3 bg-light p-3 mb-3">
                            <div className="small fw-bold mb-1">CUSTOMER'S REPORTED ISSUE</div>
                            <div className="small" style={{ whiteSpace: "pre-wrap" }}>{editingClaim.issue_description}</div>
                        </div>

                        <form onSubmit={saveClaim}>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">CLAIM STATUS</label>
                                <select
                                    className="form-select"
                                    value={editingClaim.status}
                                    onChange={(event) => setEditingClaim({ ...editingClaim, status: event.target.value })}
                                    required
                                >
                                    {(statuses.length ? statuses : STATUS_OPTIONS).map((item) => (
                                        <option key={item} value={item}>{statusLabel(item)}</option>
                                    ))}
                                </select>
                                <div className="form-text">
                                    Typical flow: Submitted → Under review → Approved → In service → Resolved. Reject or cancel when appropriate.
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">ADMIN NOTES / CUSTOMER UPDATE</label>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    maxLength="2000"
                                    value={editingClaim.admin_notes}
                                    onChange={(event) => setEditingClaim({ ...editingClaim, admin_notes: event.target.value })}
                                    placeholder="Explain the decision, next step, inspection findings, or repair outcome."
                                />
                            </div>
                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-light border" onClick={() => setEditingClaim(null)} disabled={saving}>Close</button>
                                <button type="submit" className="btn btn-primary fw-bold" disabled={saving}>
                                    {saving ? "SAVING..." : "SAVE UPDATE"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
