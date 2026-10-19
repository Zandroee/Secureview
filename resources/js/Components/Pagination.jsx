import React from "react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) {
        return null;
    }

    const getPages = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const pages = [1];

        if (currentPage > 4) {
            pages.push("...");
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let page = start; page <= end; page++) {
            pages.push(page);
        }

        if (currentPage < totalPages - 3) {
            pages.push("...");
        }

        pages.push(totalPages);

        return pages;
    };

    const pages = getPages();

    return (
        <nav className="d-flex justify-content-center mt-5" aria-label="Product pagination">
            <div className="d-flex align-items-center gap-2">

                <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: "42px", height: "42px", color: currentPage === 1 ? "#adb5bd" : "#0d6efd", transition: "all 0.2s ease" }} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
                    <i className="bi bi-chevron-left"></i>
                </button>

                <div className="d-flex align-items-center gap-1">
                    {pages.map((page, index) => {
                        if (page === "...") {
                            return (
                                <span key={`ellipsis-${index}`} className="d-flex align-items-center justify-content-center text-secondary fw-semibold" style={{ width: "34px", height: "42px" }}>
                                    ...
                                </span>
                            );
                        }

                        const isActive = currentPage === page;

                        return (
                            <button type="button" key={page} className="btn d-flex align-items-center justify-content-center fw-semibold" style={{ width: "42px", height: "42px", borderRadius: "10px", border: isActive ? "1px solid #0d6efd" : "1px solid #dee2e6", backgroundColor: isActive ? "#0d6efd" : "#fff", color: isActive ? "#fff" : "#495057", boxShadow: isActive ? "0 4px 10px rgba(13, 110, 253, 0.15)" : "none", transition: "all 0.2s ease" }} onClick={() => onPageChange(page)} aria-current={isActive ? "page" : undefined}>
                                {page}
                            </button>
                        );
                    })}
                </div>

                <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: "42px", height: "42px", color: currentPage === totalPages ? "#adb5bd" : "#0d6efd", transition: "all 0.2s ease" }} disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
                    <i className="bi bi-chevron-right"></i>
                </button>

            </div>
        </nav>
    );
}