import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import Sidebar from "../Components/Admin/Sidebar";
import StatCard from "../Components/Admin/StatCard";
import RevenueChart from "../Components/Admin/RevenueChart";
import NoticeTable from "../Components/Admin/NoticeTable";
import Calendar from "../Components/Admin/Calendar";
import Announcements from "../Components/Admin/Announcements";
import RecentOrders from "../Components/Admin/RecentOrders";
import AnnouncementFeed from "../Components/Admin/AnnouncementFeed";
import OrderStatusOverview from "../Components/Admin/OrderStatusOverview";
import { router } from "@inertiajs/react";
import { useEffect } from "react";

export default function Dashboard({
    stats = [],
    revenueData = [],
    chartPeriod = "year",
    chartPeriodOptions = [],
    dashboardFilters = {
        sales_period: "week",
        orders_period: "week",
        installations_period: "week",
        customers_period: "week",
        chart_period: "year",
    },
    orderStatusData = [],
    lowStockData = { data: [] },
    pendingPaymentData = { data: [] },
    scheduleData = [],
    upcomingScheduleCount = 0,
    recentInquiries = [],
    recentOrders = [],
    recentAnnouncements = [],
    unreadInquiryNotificationCount = 0,
    calendarAvailability = { fullyBookedDates: [], partiallyBlockedDates: [] },
}) {
    useEffect(() => {
        const refreshDashboardActivity = () => {
            if (document.visibilityState !== "visible") return;

            router.reload({
                only: [
                    "scheduleData",
                    "upcomingScheduleCount",
                    "recentInquiries",
                    "recentOrders",
                    "recentAnnouncements",
                    "unreadInquiryNotificationCount",
                    "calendarAvailability",
                ],
                preserveState: true,
                preserveScroll: true,
            });
        };

        const interval = window.setInterval(refreshDashboardActivity, 10000);
        return () => window.clearInterval(interval);
    }, []);

    const updateDashboardFilter = (key, value) => {
        router.get(
            "/dashboard",
            { ...dashboardFilters, [key]: value },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    const changeChartPeriod = (event) =>
        updateDashboardFilter("chart_period", event.target.value);

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
                                                growthLabel={stat.growthLabel}
                                                period={stat.period}
                                                periodOptions={stat.periodOptions}
                                                onPeriodChange={(value) =>
                                                    updateDashboardFilter(stat.filterKey, value)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                <RevenueChart
                                    title="Total Revenue"
                                    data={revenueData}
                                    period={chartPeriod}
                                    periodOptions={chartPeriodOptions}
                                    onPeriodChange={changeChartPeriod}
                                />

                                <div className="row g-4 mt-2">
                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Low Stock Notice"
                                            paginationLabel="low stock items"
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
                                            paginationLabel="pending payments"
                                            headers={[
                                                "Order #",
                                                "Customer",
                                                "Total",
                                            ]}
                                            rows={pendingPaymentData.data ?? []}
                                            pagination={pendingPaymentData}
                                            rowLinks={(pendingPaymentData.data ?? []).map((row) =>
                                                "/admin/purchases?search=" + encodeURIComponent(row[0])
                                            )}
                                        />
                                    </div>
                                </div>

                                <OrderStatusOverview statuses={orderStatusData} />
                            </div>

                            <div className="col-lg-3">
                                <Calendar
                                    title="Upcoming Schedule"
                                    schedules={scheduleData}
                                    upcomingCount={upcomingScheduleCount}
                                    fullyBookedDates={calendarAvailability.fullyBookedDates ?? []}
                                    partiallyBlockedDates={calendarAvailability.partiallyBlockedDates ?? []}
                                />

                                <div className="mt-4">
                                    <Announcements
                                        title="Recent Inquiries"
                                        announcements={recentInquiries}
                                        unreadNotificationCount={unreadInquiryNotificationCount}
                                    />
                                </div>

                                <div className="mt-4">
                                    <RecentOrders orders={recentOrders} />
                                </div>

                                <div className="mt-4">
                                    <AnnouncementFeed announcements={recentAnnouncements} />
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
