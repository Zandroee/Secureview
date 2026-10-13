import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function actionClass(action) {
    if (action === "package_deleted") {
        return "bg-danger-subtle text-danger";
    }

    if (action === "product_stock_updated" || action === "package_updated") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    if (action === "inquiry_status_updated" || action === "package_created") {
        return "bg-success-subtle text-success";
    }

    if (action === "user_role_updated") {
        return "bg-primary-subtle text-primary";
    }

    return "bg-info-subtle text-info-emphasis";
}

function prettyValue(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    return String(value).replace(/_/g, " ");
}

function ValuesList({ title, values, tone }) {
    const entries = Object.entries(values ?? {});

    return (
        <div className="col-md-6">
            <div className="border rounded-3 p-3 h-100">
                <div className={"small fw-bold mb-2 " + tone}>{title}</div>
                {entries.length === 0 ? (
                    <div className="small text-muted">No values recorded.</div>
                ) : (
                    <dl className="row small mb-0">
                        {entries.map(([key, value]) => (
                            <div className="row mb-2" key={key}>
                                <dt className="col-5 text-muted text-capitalize">
                                    {key.replace(/_/g, " ")}
                                </dt>
                                <dd className="col-7 mb-0 fw-semibold text-break">
                                    {prettyValue(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </div>
    );
}

export default function AdminActivityLogs({
    logs = { data: [], links: [] },
    admins = [],
    actionOptions = [],
    filters = {},
    summary = {},
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [action, setAction] = useState(filters.action ?? "");
    const [adminId, setAdminId] = useState(filters.admin_id ? String(filters.admin_id) : "");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");
    const [viewingLog, setViewingLog] = useState(null);

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/activity-logs",
            {
                search,
                action,
                admin_id: adminId,
                date_from: dateFrom,
                date_to: dateTo,
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
        setAction("");
        setAdminId("");
        setDateFrom("");
        setDateTo("");

        router.get(
            "/admin/activity-logs",
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
                        <Sidebar active="activity-logs" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>
                                <h1 className="fw-bold mb-1">ADMIN ACTIVITY LOGS</h1>
                                <div className="small text-muted">
                                    Review administrator changes with timestamps and before-and-after values.
                                </div>
                            </div>

                            <div className="small text-muted d-flex align-items-center gap-2">
                                <i className="bi bi-shield-check fs-5 text-primary" />
                                Read-only audit trail
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-4">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">TOTAL RECORDED ACTIONS</div>
                                    <div className="h3 fw-bold mb-0">{summary.total ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">ACTIONS TODAY</div>
                                    <div className="h3 fw-bold text-primary mb-0">{summary.today ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">ADMIN ACCOUNTS WITH ACTIVITY</div>
                                    <div className="h3 fw-bold mb-0">{summary.admins ?? 0}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-3 p-3 p-md-4 mb-4">
                            <form onSubmit={applyFilters}>
                                <div className="row g-3 align-items-end">
                                    <div className="col-12 col-lg-4">
                                        <label className="form-label small fw-semibold">SEARCH</label>
                                        <input
                                            className="form-control"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Admin, action, target ID..."
                                            maxLength={120}
                                        />
                                    </div>

                                    <div className="col-12 col-sm-6 col-lg-2">
                                        <label className="form-label small fw-semibold">ACTION TYPE</label>
                                        <select
                                            className="form-select"
                                            value={action}
                                            onChange={(event) => setAction(event.target.value)}
                                        >
                                            <option value="">All actions</option>
                                            {actionOptions.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-12 col-sm-6 col-lg-2">
                                        <label className="form-label small fw-semibold">ADMIN</label>
                                        <select
                                            className="form-select"
                                            value={adminId}
                                            onChange={(event) => setAdminId(event.target.value)}
                                        >
                                            <option value="">All admins</option>
                                            {admins.map((admin) => (
                                                <option key={admin.id} value={admin.id}>
                                                    {admin.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-6 col-lg-2">
                                        <label className="form-label small fw-semibold">FROM</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={dateFrom}
                                            max={dateTo || undefined}
                                            onChange={(event) => setDateFrom(event.target.value)}
                                        />
                                    </div>

                                    <div className="col-6 col-lg-2">
                                        <label className="form-label small fw-semibold">TO</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={dateTo}
                                            min={dateFrom || undefined}
                                            onChange={(event) => setDateTo(event.target.value)}
                                        />
                                    </div>

                                    <div className="col-6 col-lg-2 d-grid">
                                        <button type="submit" className="btn btn-primary fw-semibold">
                                            <i className="bi bi-funnel me-1" /> FILTER
                                        </button>
                                    </div>
                                    <div className="col-6 col-lg-2 d-grid">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary fw-semibold"
                                            onClick={clearFilters}
                                        >
                                            CLEAR
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">TIME</th>
                                            <th>ADMIN</th>
                                            <th>ACTION</th>
                                            <th>DETAIL</th>
                                            <th className="text-end pe-3">VIEW</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(logs.data ?? []).length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted py-5">
                                                    <i className="bi bi-journal-text fs-2 d-block mb-2" />
                                                    No activity logs match these filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.data.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="ps-3">
                                                        <div className="fw-semibold">{log.created_at}</div>
                                                        <div className="small text-muted">Log #{log.id}</div>
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold">{log.admin_name}</div>
                                                        <div className="small text-muted">{log.admin_email || "Account no longer available"}</div>
                                                    </td>
                                                    <td>
                                                        <span className={"badge rounded-pill px-3 py-2 " + actionClass(log.action)}>
                                                            {log.action_label}
                                                        </span>
                                                    </td>
                                                    <td style={{ minWidth: "260px", maxWidth: "420px" }}>
                                                        <div>{log.description}</div>
                                                        {log.subject_type && (
                                                            <div className="small text-muted mt-1">
                                                                Target: {log.subject_type}{log.subject_id ? " #" + log.subject_id : ""}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary fw-semibold"
                                                            onClick={() => setViewingLog(log)}
                                                        >
                                                            DETAILS
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top">
                                <div className="small text-muted">
                                    Showing {logs.from ?? 0}–{logs.to ?? 0} of {logs.total ?? 0} actions
                                </div>
                                <div className="d-flex gap-1 flex-wrap">
                                    {(logs.links ?? []).map((link, index) => (
                                        link.url ? (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                preserveScroll
                                                className={"btn btn-sm " + (link.active ? "btn-primary" : "btn-outline-secondary")}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={index}
                                                className="btn btn-sm btn-outline-secondary disabled"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="small text-muted mt-3">
                            Successful admin sign-ins, sign-outs, and supported administrative changes are recorded by the server. This page does not allow logs to be edited or deleted.
                        </div>
                    </main>
                </div>
            </div>

            {viewingLog && (
                <div
                    className="modal d-block"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="activityLogModalTitle"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", zIndex: 1055 }}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setViewingLog(null);
                    }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header">
                                <div>
                                    <div className="small text-muted">ACTIVITY LOG #{viewingLog.id}</div>
                                    <h2 className="modal-title fs-5 fw-bold" id="activityLogModalTitle">
                                        {viewingLog.action_label}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => setViewingLog(null)}
                                />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <div className="small text-muted mb-1">DESCRIPTION</div>
                                    <div className="fw-semibold">{viewingLog.description}</div>
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-sm-6">
                                        <div className="small text-muted">ADMINISTRATOR</div>
                                        <div className="fw-semibold">{viewingLog.admin_name}</div>
                                        <div className="small text-muted">{viewingLog.admin_email || "Account no longer available"}</div>
                                    </div>
                                    <div className="col-sm-6">
                                        <div className="small text-muted">DATE AND TIME</div>
                                        <div className="fw-semibold">{viewingLog.created_at}</div>
                                    </div>
                                    <div className="col-sm-6">
                                        <div className="small text-muted">TARGET</div>
                                        <div className="fw-semibold">
                                            {viewingLog.subject_type || "—"}
                                            {viewingLog.subject_id ? " #" + viewingLog.subject_id : ""}
                                        </div>
                                    </div>
                                    <div className="col-sm-6">
                                        <div className="small text-muted">IP ADDRESS</div>
                                        <div className="fw-semibold">{viewingLog.ip_address || "Not available"}</div>
                                    </div>
                                </div>

                                <div className="row g-3 mb-3">
                                    <ValuesList title="BEFORE" values={viewingLog.old_values} tone="text-danger" />
                                    <ValuesList title="AFTER" values={viewingLog.new_values} tone="text-success" />
                                </div>

                                {viewingLog.user_agent && (
                                    <div>
                                        <div className="small text-muted mb-1">CLIENT</div>
                                        <div className="small text-break bg-light border rounded-3 p-2">
                                            {viewingLog.user_agent}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setViewingLog(null)}>
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
