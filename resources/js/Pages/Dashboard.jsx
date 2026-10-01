import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import Sidebar from "../Components/Admin/Sidebar";
import StatCard from "../Components/Admin/StatCard";
import RevenueChart from "../Components/Admin/RevenueChart";
import NoticeTable from "../Components/Admin/NoticeTable";
import Calendar from "../Components/Admin/Calendar";
import Announcements from "../Components/Admin/Announcements";

export default function Dashboard(){
    // Mock data lang muna hehe for UI development, papalitan nalang to later pag may actual data na.
    const stats = [
        {
            title:"Total Sales",
            value:"₱23,245",
            growth:13.4
        },
        {
            title:"Total Orders",
            value:"23",
            growth:3.6
        },
        {
            title:"Total Installation",
            value:"14",
            growth:5.3
        },
        {
            title:"New Customers",
            value:"4",
            growth:-1.2
        }
    ];

    const lowStockData = [
        [
            "0200345",
            "Dahua Bullet Camera",
            "2"
        ],
        [
            "0200346",
            "Hikvision DVR",
            "1"
        ]
    ];


    const warrantyData = [
        [
            "0500620",
            "Daniel Daniel",
            "04-21-26"
        ]
    ];

    const scheduleData = [
        {
            title:"CCTV Installation",
            date:"September 30, 2026",
            description:"Installation schedule for customer"
        },
        {
            title:"Maintenance Check",
            date:"October 5, 2026",
            description:"Camera inspection"
        }
    ];


    const announcementData = [
        {
            title:"System Update",
            message:"New CCTV packages have been added.",
            date:"Today"
        },
        {
            title:"Maintenance Notice",
            message:"Server maintenance scheduled.",
            date:"Tomorrow"
        }
    ];

    return(
    <>
        <Navbar/>
            <div className="container-fluid">
                <div className="row">
                    {/* Sidebar */}
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar/>
                    </aside>



                    {/* Main Dashboard */}
                    <main className="col-md-9 col-lg-10 p-4 min-vh-100">
                        <div className="row g-4">

                            {/* LEFT CONTENT */}
                            <div className="col-lg-9">

                                {/* Dashboard Header */}
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h1 className="fw-bold text-primary mb-0">
                                        Dashboard
                                    </h1>
                                    <button className="btn btn-light text-primary fw-bold">
                                        This Week
                                    </button>
                                </div>

                                {/* Statistic Cards */}
                                <div className="row g-3">
                                    {
                                        stats.map((stat,index)=>(
                                            <div
                                                className="col-12 col-sm-6 col-xl-3"
                                                key={index}
                                            >
                                                <StatCard
                                                    title={stat.title}
                                                    value={stat.value}
                                                    growth={stat.growth}
                                                />
                                            </div>
                                        ))
                                    }
                                </div>

                                {/* Revenue Chart */}
                                <RevenueChart
                                    title="Total Revenue"
                                />


                                {/* Tables */}
                                <div className="row g-4 mt-4">
                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Low Stock Notice"
                                            headers={[
                                                "Product ID",
                                                "Product Name",
                                                "Quantity"
                                            ]}
                                            rows={lowStockData}
                                        />
                                    </div>

                                    <div className="col-lg-6">
                                        <NoticeTable
                                            title="Warranty Notice"
                                            headers={[
                                                "Receipt ID",
                                                "Customer Name",
                                                "Expiry Date"
                                            ]}
                                            rows={warrantyData}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT CONTENT */}
                            <div className="col-lg-3">

                                <Calendar
                                    title="Upcoming Schedule"
                                    schedules={scheduleData}
                                />

                                <div className="mt-4">

                                    <Announcements
                                        title="Announcements"
                                        announcements={announcementData}
                                    />

                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        <Footer/>
        </>
    );
}