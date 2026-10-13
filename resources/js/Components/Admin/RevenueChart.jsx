import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
);

const currency = (value) =>
    `₱${Number(value).toLocaleString("en-PH", {
        maximumFractionDigits: 0,
    })}`;

export default function RevenueChart({
    title,
    data = [],
    period = "year",
    onPeriodChange,
}) {
    const chartData = {
        labels: data.map((item) => item.month),
        datasets: [
            {
                label: "Revenue",
                data: data.map((item) => item.revenue),
                borderColor: "#0d6efd",
                backgroundColor: "rgba(13, 110, 253, 0.12)",
                pointBackgroundColor: "#0d6efd",
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2,
                tension: 0.35,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Revenue: ₱${Number(context.parsed.y).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}`,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: (value) => currency(value) },
            },
        },
    };

    return (
        <div className="card border rounded-3 mt-4">
            <div className="card-body p-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                    <h5 className="fw-bold mb-0">{title}</h5>
                    <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: "190px" }}
                        aria-label="Filter revenue chart period"
                        value={period}
                        onChange={onPeriodChange}
                    >
                        <option value="year">This year</option>
                        <option value="six_months">Last 6 months</option>
                        <option value="twelve_months">Last 12 months</option>
                    </select>
                </div>

                <div style={{ height: "300px" }}>
                    {data.length > 0 ? (
                        <Line data={chartData} options={options} />
                    ) : (
                        <div className="bg-light rounded-3 d-flex justify-content-center align-items-center h-100 text-muted">
                            No revenue data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
