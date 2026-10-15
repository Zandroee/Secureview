import { useState } from "react";

export default function StatCard({
    title,
    value,
    growth,
    growthLabel = "vs previous period",
    period = "week",
    periodOptions = [],
    onPeriodChange,
}) {
    const [periodMenuOpen, setPeriodMenuOpen] = useState(false);

    const growthClass =
        growth === null
            ? "text-muted"
            : growth >= 0
              ? "text-success"
              : "text-danger";

    const comparisonText =
        growth === null
            ? period === "all_time"
                ? "Historical total"
                : "No comparison baseline"
            : `${growth >= 0 ? "+" : ""}${growth}% ${growthLabel}`;

    return (
        <div className="card border rounded-3 h-100">
            <div className="card-body p-3 p-lg-4">
                <small className="text-muted fw-semibold d-block">
                    {title}
                </small>

                <h3 className="fw-bold mt-2 mb-2 text-break">{value}</h3>

                <div className="position-relative mt-2">
                    <button
                        type="button"
                        className={
                            "btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-2 " +
                            growthClass
                        }
                        style={{
                            fontSize: "0.875rem",
                            lineHeight: 1.4,
                            maxWidth: "100%",
                            textAlign: "left",
                        }}
                        aria-haspopup="true"
                        aria-expanded={periodMenuOpen}
                        aria-label={`Filter ${title} period. Current: ${comparisonText}`}
                        title={`Change ${title} time period`}
                        onClick={() => setPeriodMenuOpen((open) => !open)}
                    >
                        <span>{comparisonText}</span>
                        <i
                            className={
                                "bi " +
                                (periodMenuOpen ? "bi-chevron-up" : "bi-chevron-down")
                            }
                            aria-hidden="true"
                        />
                    </button>

                    {periodMenuOpen && (
                        <>
                            <button
                                type="button"
                                aria-label="Close time period menu"
                                className="position-fixed top-0 start-0 w-100 h-100 border-0 p-0"
                                style={{
                                    background: "transparent",
                                    zIndex: 1040,
                                    cursor: "default",
                                }}
                                onClick={() => setPeriodMenuOpen(false)}
                            />

                            <div
                                className="position-absolute bg-white border rounded-3 shadow py-1"
                                style={{
                                    left: 0,
                                    bottom: "calc(100% + 6px)",
                                    minWidth: "165px",
                                    maxHeight: "240px",
                                    overflowY: "auto",
                                    zIndex: 1050,
                                }}
                                role="menu"
                                aria-label={`${title} time ranges`}
                            >
                                {periodOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={period === option.value}
                                        className={
                                            "dropdown-item d-flex align-items-center justify-content-between gap-3 px-3 py-2 small " +
                                            (period === option.value
                                                ? "active"
                                                : "text-dark")
                                        }
                                        onClick={() => {
                                            setPeriodMenuOpen(false);
                                            onPeriodChange?.(option.value);
                                        }}
                                    >
                                        <span>{option.label}</span>
                                        {period === option.value && (
                                            <i className="bi bi-check2" aria-hidden="true" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
