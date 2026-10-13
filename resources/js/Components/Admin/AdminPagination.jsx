import { Link } from "@inertiajs/react";

export default function AdminPagination({
    pagination,
    label = "records",
    compact = false,
}) {
    if (!pagination || typeof pagination !== "object") {
        return null;
    }

    const total = pagination.total ?? 0;
    const from = pagination.from ?? 0;
    const to = pagination.to ?? 0;
    const currentPage = pagination.current_page ?? 1;
    const lastPage = pagination.last_page ?? 1;
    const links = pagination.links ?? [];
    const previousLink = links[0];
    const nextLink = links[links.length - 1];
    const pageLinks = links.slice(1, -1);
    const buttonSize = compact ? "30px" : "42px";
    const pageLinkLabel = (label) =>
        String(label).replace(/&hellip;/gi, "...").replace(/&#8230;/gi, "...");

    const arrowButtonStyle = (disabled) => ({
        width: buttonSize,
        height: buttonSize,
        minWidth: buttonSize,
        color: disabled ? "#adb5bd" : "#0d6efd",
        transition: "all 0.2s ease",
        padding: 0,
    });

    const pageButtonStyle = (active) => ({
        width: buttonSize,
        height: buttonSize,
        minWidth: buttonSize,
        borderRadius: "10px",
        border: active ? "1px solid #0d6efd" : "1px solid #dee2e6",
        backgroundColor: active ? "#0d6efd" : "#fff",
        color: active ? "#fff" : "#495057",
        boxShadow: active ? "0 4px 10px rgba(13, 110, 253, 0.15)" : "none",
        transition: "all 0.2s ease",
        padding: 0,
        fontSize: compact ? "0.75rem" : "0.9rem",
    });

    return (
        <div
            className={
                "d-flex flex-wrap align-items-center justify-content-between gap-2 " +
                (compact ? "mt-3" : "mt-3 p-3 border-top")
            }
        >
            <small className="text-muted">
                Showing {from}–{to} of {total} {label}
            </small>

            {lastPage > 1 && (
                <nav aria-label={`Pagination for ${label}`}>
                    <div className="d-flex align-items-center gap-1">
                        {previousLink?.url ? (
                            <Link
                                href={previousLink.url}
                                preserveScroll
                                aria-label="Previous page"
                                className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                style={arrowButtonStyle(false)}
                            >
                                <i className="bi bi-chevron-left" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                disabled
                                aria-label="Previous page"
                                className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                style={arrowButtonStyle(true)}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>
                        )}

                        <div className="d-flex align-items-center gap-1">
                            {pageLinks.map((link, index) => {
                                const text = pageLinkLabel(link.label);
                                const isEllipsis = text.includes("...");
                                const isNumber = /^\d+$/.test(text);

                                if (isEllipsis || !isNumber) {
                                    return (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className="d-flex align-items-center justify-content-center text-secondary fw-semibold"
                                            style={{
                                                width: compact ? "18px" : "26px",
                                                height: buttonSize,
                                                fontSize: compact ? "0.7rem" : "0.85rem",
                                            }}
                                        >
                                            {isEllipsis ? "…" : text}
                                        </span>
                                    );
                                }

                                return link.url ? (
                                    <Link
                                        key={text}
                                        href={link.url}
                                        preserveScroll
                                        aria-current={link.active ? "page" : undefined}
                                        aria-label={`Page ${text}`}
                                        className="btn d-flex align-items-center justify-content-center fw-semibold"
                                        style={pageButtonStyle(link.active)}
                                    >
                                        {text}
                                    </Link>
                                ) : (
                                    <button
                                        key={text}
                                        type="button"
                                        disabled
                                        className="btn d-flex align-items-center justify-content-center fw-semibold"
                                        style={pageButtonStyle(link.active)}
                                    >
                                        {text}
                                    </button>
                                );
                            })}
                        </div>

                        {nextLink?.url ? (
                            <Link
                                href={nextLink.url}
                                preserveScroll
                                aria-label="Next page"
                                className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                style={arrowButtonStyle(false)}
                            >
                                <i className="bi bi-chevron-right" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                disabled
                                aria-label="Next page"
                                className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                style={arrowButtonStyle(true)}
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        )}
                    </div>
                </nav>
            )}
        </div>
    );
}
