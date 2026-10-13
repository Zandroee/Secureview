import { Link } from "@inertiajs/react";

export default function AdminPagination({ pagination, compact = false }) {
    if (!pagination || typeof pagination !== "object") {
        return null;
    }

    const total = pagination.total ?? 0;
    const from = pagination.from ?? 0;
    const to = pagination.to ?? 0;
    const currentPage = pagination.current_page ?? 1;
    const lastPage = pagination.last_page ?? 1;

    return (
        <div
            className={
                "d-flex flex-wrap align-items-center justify-content-between gap-2 " +
                (compact ? "mt-3" : "mt-3 pt-3 border-top")
            }
        >
            <small className="text-muted">
                Showing {from}–{to} of {total}
            </small>

            {lastPage > 1 && (
                <div className="d-flex align-items-center gap-2">
                    {pagination.prev_page_url ? (
                        <Link
                            href={pagination.prev_page_url}
                            className="btn btn-sm btn-outline-primary"
                            preserveScroll
                        >
                            <i className="bi bi-chevron-left me-1" />
                            Previous
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                        >
                            <i className="bi bi-chevron-left me-1" />
                            Previous
                        </button>
                    )}

                    <span className="small text-muted text-nowrap">
                        Page {currentPage} of {lastPage}
                    </span>

                    {pagination.next_page_url ? (
                        <Link
                            href={pagination.next_page_url}
                            className="btn btn-sm btn-outline-primary"
                            preserveScroll
                        >
                            Next
                            <i className="bi bi-chevron-right ms-1" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                        >
                            Next
                            <i className="bi bi-chevron-right ms-1" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
