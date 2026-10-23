import { Link } from "@inertiajs/react";
import { useState } from "react";
import PanelPagination from "./PanelPagination";

function urgencyClass(urgency) {
    if (urgency === "emergency") return "bg-danger-subtle text-danger";
    if (urgency === "urgent") return "bg-warning-subtle text-warning-emphasis";
    return "bg-light text-secondary border";
}

function statusClass(status) {
    if (status === "pending") return "bg-warning-subtle text-warning-emphasis";
    if (status === "confirmed") return "bg-info-subtle text-info-emphasis";
    if (status === "in_progress") return "bg-primary-subtle text-primary";
    if (status === "completed") return "bg-success-subtle text-success";
    if (status === "cancelled") return "bg-secondary-subtle text-secondary";
    return "bg-light text-secondary border";
}

export default function Announcements({
    title = "Recent Services",
    announcements = [],
    unreadNotificationCount = 0,
}) {
    const rows = announcements ?? [];
    const [page, setPage] = useState(1);
    const pageSize = 3;
    const totalPages = Math.ceil(rows.length / pageSize);
    const safePage = Math.min(page, Math.max(1, totalPages));
    const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <div className="card border rounded-3">
            <div className="card-body p-3 p-lg-4">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">{title}</h5>
                        <div className="small text-muted">Latest service requests and their current status.</div>
                    </div>
                    <Link href="/admin/inquiries" className="btn btn-sm btn-outline-primary text-nowrap">
                        View all services
                    </Link>
                </div>

                {unreadNotificationCount > 0 && (
                    <Link
                        href="/notifications"
                        className="d-flex align-items-center justify-content-between gap-2 rounded-3 bg-warning-subtle text-warning-emphasis px-3 py-2 mb-3 text-decoration-none"
                        title="Open unread service notifications"
                    >
                        <span className="small fw-semibold">
                            <i className="bi bi-bell me-2" />
                            Unread service alerts
                        </span>
                        <span className="badge bg-warning text-dark rounded-pill">
                            {unreadNotificationCount}
                        </span>
                    </Link>
                )}

                {rows.length > 0 ? (
                    <>
                    <div className="d-flex flex-column gap-2">
                        {pageRows.map((inquiry) => (
                            <Link
                                key={inquiry.id}
                                href={"/admin/inquiries/" + inquiry.id}
                                className="d-block border rounded-3 p-3 text-decoration-none text-reset"
                            >
                                <div className="d-flex align-items-start justify-content-between gap-2">
                                    <div className="min-w-0">
                                        <div className="fw-bold">{inquiry.title}</div>
                                        <div className="small text-muted mt-1">
                                            {inquiry.inquiry_number}
                                            {inquiry.customer_name ? " · " + inquiry.customer_name : ""}
                                        </div>
                                    </div>
                                    <span className={"badge rounded-pill text-capitalize flex-shrink-0 " + urgencyClass(inquiry.urgency)}>
                                        {inquiry.urgency || "normal"}
                                    </span>
                                </div>

                                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                                    <span className={"badge rounded-pill text-capitalize " + statusClass(inquiry.status)}>
                                        {String(inquiry.status || "pending").replace(/_/g, " ")}
                                    </span>
                                    <span className="small text-muted">{inquiry.date}</span>
                                </div>

                                {(inquiry.preferred_date || inquiry.preferred_time) && (
                                    <div className="small text-muted mt-2">
                                        <i className="bi bi-calendar-event me-1" />
                                        {inquiry.preferred_date || "Date not set"}
                                        {inquiry.preferred_time ? " · " + inquiry.preferred_time : ""}
                                    </div>
                                )}
                                <div className="small text-primary fw-semibold mt-2">
                                    Review service <i className="bi bi-arrow-up-right ms-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                    <PanelPagination
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={rows.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                    />
                    </>
                ) : (
                    <div className="text-center border rounded-3 bg-light p-4">
                        <i className="bi bi-chat-square-text fs-4 text-muted d-block mb-2" />
                        <p className="small text-muted mb-2">No pending service requests need attention right now.</p>
                        <Link href="/admin/inquiries" className="small fw-semibold text-decoration-none">
                            Open services
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
