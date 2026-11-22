export default function PanelPagination({
    page,
    totalPages,
    onPageChange,
    totalItems,
    pageSize,
}) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);

    return (
        <nav
            className="d-flex align-items-center justify-content-between gap-2 border-top pt-3 mt-3"
            aria-label="Panel list pagination"
        >
            <span className="small text-muted text-nowrap">
                {start}–{end} of {totalItems}
            </span>
            <div className="d-flex align-items-center gap-1">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                >
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                <span className="small text-muted px-1 text-nowrap">
                    {page} / {totalPages}
                </span>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                >
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
