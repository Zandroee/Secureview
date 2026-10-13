import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import Sidebar from "../Components/Admin/Sidebar";
import StatCard from "../Components/Admin/StatCard";
import RevenueChart from "../Components/Admin/RevenueChart";
import NoticeTable from "../Components/Admin/NoticeTable";
import Calendar from "../Components/Admin/Calendar";
import Announcements from "../Components/Admin/Announcements";

export default function Dashboard({
    stats = [],
    revenueData = [],
    lowStockData = [],
    pendingPaymentData = [],
    scheduleData = [],
    recentInquiries = [],
}) {
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
                                    <h1 className="fw-bold text-primary mb-0">
                                        Dashboard
                                    </h1>
                                    <span className="btn btn-light text-primary fw-bold">
                                        This Week
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
                                />

                                <div className="row g-4 mt-4">
                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Low Stock Notice"
                                            headers={[
                                                "Product ID",
                                                "Product Name",
                                                "Quantity",
                                            ]}
                                            rows={lowStockData}
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
                                            rows={pendingPaymentData}
                                        />
                                    </div>
                                </div>
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
