export default function StatCard({
    title,
    value,
    growth,
    growthLabel = "vs previous period",
    period = "week",
    periodOptions = [],
    onPeriodChange,
}) {
    const growthClass =
        growth === null
            ? "text-muted"
            : growth >= 0
              ? "text-success"
              : "text-danger";

    return (
        <div className="card border rounded-3 h-100">
            <div className="card-body p-3 p-lg-4">
                <div className="d-flex align-items-start justify-content-between gap-2">
                    <div className="flex-grow-1 min-w-0">
                        <small className="text-muted fw-semibold">{title}</small>
                        <h3 className="fw-bold mt-2 mb-2 text-break">{value}</h3>
                    </div>

                    <select
                        className="form-select form-select-sm flex-shrink-0"
                        style={{
                            width: "116px",
                            fontSize: "0.72rem",
                            paddingLeft: "0.45rem",
                            paddingRight: "1.5rem",
                        }}
                        aria-label={title + " time period"}
                        title={"Filter " + title + " by time period"}
                        value={period}
                        onChange={(event) => onPeriodChange?.(event.target.value)}
                    >
                        {periodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <small className={growthClass}>
                    {growth === null
                        ? period === "all_time"
                            ? "Historical total"
                            : "No comparison baseline"
                        : `${growth >= 0 ? "+" : ""}${growth}% ${growthLabel}`}
                </small>
            </div>
        </div>
    );
}
