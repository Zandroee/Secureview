import { Link } from "@inertiajs/react";
import { useState } from "react";
import PanelPagination from "./PanelPagination";

export default function AnnouncementFeed({ announcements = [], manageHref = "/notifications", manageLabel = "Manage", emptyMessage = "No announcements have been published.", emptyLinkLabel = "Create an announcement" }) {
    const [page, setPage] = useState(1);
    const pageSize = 3;
    const totalPages = Math.ceil(announcements.length / pageSize);
    const safePage = Math.min(page, Math.max(1, totalPages));
    const pageAnnouncements = announcements.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <section className="card border rounded-3">
            <div className="card-body p-3 p-lg-4">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">Announcements</h5>
                        <p className="small text-muted mb-0">Updates published by the admin.</p>
                    </div>
                    <Link href={manageHref} className="btn btn-sm btn-outline-primary text-nowrap">
                        {manageLabel}
                    </Link>
                </div>

                {announcements.length ? (
                    <>
                    <div className="d-flex flex-column gap-2">
                        {pageAnnouncements.map((announcement) => (
                            <article key={announcement.id} className="border rounded-3 p-3">
                                <div className="d-flex align-items-start gap-2">
                                    <span className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary flex-shrink-0" style={{ width: 36, height: 36 }}>
                                        <i className="bi bi-megaphone" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="fw-bold">{announcement.title}</div>
                                        <div className="small text-muted mt-1">{announcement.created_at}</div>
                                    </div>
                                </div>
                                <p className="small mb-0 mt-2" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                                    {announcement.message}
                                </p>
                            </article>
                        ))}
                    </div>
                    <PanelPagination
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={announcements.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                    />
                    </>
                ) : (
                    <div className="text-center border rounded-3 bg-light p-4">
                        <i className="bi bi-megaphone fs-4 text-muted d-block mb-2" />
                        <p className="small text-muted mb-2">{emptyMessage}</p>
                        <Link href={manageHref} className="small fw-semibold text-decoration-none">{emptyLinkLabel}</Link>
                    </div>
                )}
            </div>
        </section>
    );
}
