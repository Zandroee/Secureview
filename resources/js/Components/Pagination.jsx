import React from "react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) {
        return null;
    }

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <nav className="products-pagination d-flex justify-content-center mt-5" aria-label="Product pagination">

            <ul className="pagination mb-0">

                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button className="page-link" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                </li>

                {pages.map((page) => (
                    <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                        <button className="page-link" onClick={() => onPageChange(page)}>
                            {page}
                        </button>
                    </li>
                ))}

                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button className="page-link" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </li>

            </ul>

        </nav>
    );
}