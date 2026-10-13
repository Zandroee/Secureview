import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import Sidebar from "../Components/Admin/Sidebar";
import StatCard from "../Components/Admin/StatCard";
import RevenueChart from "../Components/Admin/RevenueChart";
import NoticeTable from "../Components/Admin/NoticeTable";
import Calendar from "../Components/Admin/Calendar";
import Announcements from "../Components/Admin/Announcements";
import OrderStatusOverview from "../Components/Admin/OrderStatusOverview";
import { router } from "@inertiajs/react";

export default function Dashboard({
    stats = [],
    revenueData = [],
    chartPeriod = "year",
    orderStatusData = [],
    lowStockData = { data: [] },
    pendingPaymentData = { data: [] },
    scheduleData = [],
    recentInquiries = [],
}) {
    const changeChartPeriod = (event) => {
        router.get(
            "/dashboard",
            { chart_period: event.target.value },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar />
                    </aside>

                    <main className="col-md-9 col-lg-10 p-4 min-vh-100">
                        <div className="row g-4">
                            <div className="col-lg-9">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <div className="small text-primary fw-bold">
                                            SECUREVIEW ADMIN
                                        </div>
                                        <h1 className="fw-bold text-primary mb-0">
                                            Dashboard
                                        </h1>
                                    </div>
                                    <span className="badge bg-light text-primary border px-3 py-2">
                                        Live data
                                    </span>
                                </div>

                                <div className="row g-3">
                                    {stats.map((stat) => (
                                        <div
                                            className="col-12 col-sm-6 col-xl-3"
                                            key={stat.title}
                                        >
                                            <StatCard
                                                title={stat.title}
                                                value={stat.value}
                                                growth={stat.growth}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <RevenueChart
                                    title="Total Revenue"
                                    data={revenueData}
                                    period={chartPeriod}
                                    onPeriodChange={changeChartPeriod}
                                />

                                <div className="row g-4 mt-2">
                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Low Stock Notice"
                                            headers={[
                                                "Product ID",
                                                "Product Name",
                                                "Quantity",
                                            ]}
                                            rows={lowStockData.data ?? []}
                                            pagination={lowStockData}
                                        />
                                    </div>

                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Pending Payments"
                                            headers={[
                                                "Order #",
                                                "Customer",
                                                "Total",
                                            ]}
                                            rows={pendingPaymentData.data ?? []}
                                            pagination={pendingPaymentData}
                                        />
                                    </div>
                                </div>

                                <OrderStatusOverview statuses={orderStatusData} />
                            </div>

                            <div className="col-lg-3">
                                <Calendar
                                    title="Upcoming Schedule"
                                    schedules={scheduleData}
                                />

                                <div className="mt-4">
                                    <Announcements
                                        title="Recent Inquiries"
                                        announcements={recentInquiries}
                                    />
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </>
    );
}
