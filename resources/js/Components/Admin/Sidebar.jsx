import { Link, usePage } from "@inertiajs/react";

export default function Sidebar({ active = "dashboard" }) {
    const { props } = usePage();
    const user = props.auth?.user;

    const menuItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            key: "dashboard",
            icon: "bi-speedometer2",
        },
        {
            label: "Inquiries",
            href: "/admin/inquiries",
            key: "inquiries",
            icon: "bi-chat-left-text",
        },
        {
            label: "Users",
            href: "/admin/users",
            key: "users",
            icon: "bi-people",
        },
        {
            label: "Products",
            href: "/admin/products",
            key: "products",
            icon: "bi-camera-video",
        },
        {
            label: "Schedules",
            href: "/admin/schedules",
            key: "schedules",
            icon: "bi-calendar3",
        },
        {
            label: "Purchase History",
            href: "/admin/purchases",
            key: "purchases",
            icon: "bi-bag-check",
        },
    ];

    const comingSoonItems = [
        {
            label: "Packages",
            icon: "bi-box-seam",
        },
        {
            label: "Transaction Logs",
            icon: "bi-receipt",
        },

    ];

    return (
        <aside
            className="bg-white border-end min-vh-100 p-3"
            style={{
                fontFamily: "Outfit, sans-serif",
            }}
        >
            <div className="d-flex align-items-center gap-2 mb-4">
                <div
                    className="bg-primary rounded-circle d-flex justify-content-center align-items-center flex-shrink-0"
                    style={{
                        width: "40px",
                        height: "40px",
                    }}
                >
                    <i className="bi bi-person text-white"></i>
                </div>

                <div className="min-w-0">
                    <div className="small text-muted">ADMIN</div>

                    <strong className="text-truncate d-block">
                        {user?.name || "Administrator"}
                    </strong>
                </div>
            </div>

            <hr />

            <div className="d-flex flex-column gap-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={
                            "btn text-start rounded-2 fw-semibold " +
                            (active === item.key
                                ? "btn-primary"
                                : "btn-light")
                        }
                    >
                        <i className={"bi " + item.icon + " me-2"}></i>
                        {item.label}
                    </Link>
                ))}

                <div className="small text-uppercase text-muted fw-bold mt-3 mb-1">
                    Coming Soon
                </div>

                {comingSoonItems.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        className="btn btn-light text-start text-muted"
                        disabled
                    >
                        <i className={"bi " + item.icon + " me-2"}></i>
                        {item.label}
                    </button>
                ))}
            </div>
        </aside>
    );
}
