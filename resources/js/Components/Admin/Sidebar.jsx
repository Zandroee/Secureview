import { Link, usePage } from "@inertiajs/react";

const menuSections = [
    {
        title: "Overview",
        items: [
            {
                label: "Dashboard",
                href: "/dashboard",
                key: "dashboard",
                icon: "bi-speedometer2",
            },
        ],
    },
    {
        title: "Service Management",
        items: [
            {
                label: "Inquiries",
                href: "/admin/inquiries",
                key: "inquiries",
                icon: "bi-chat-left-text",
            },
            {
                label: "Schedules",
                href: "/admin/schedules",
                key: "schedules",
                icon: "bi-calendar3",
            },
        ],
    },
    {
        title: "Catalog",
        items: [
            {
                label: "Products",
                href: "/admin/products",
                key: "products",
                icon: "bi-camera-video",
            },
            {
                label: "Packages",
                href: "/admin/packages",
                key: "packages",
                icon: "bi-box-seam",
            },
        ],
    },
    {
        title: "People & Access",
        items: [
            {
                label: "Users",
                href: "/admin/users",
                key: "users",
                icon: "bi-people",
            },
        ],
    },
    {
        title: "Reports & Audit",
        items: [
            {
                label: "Transaction Logs",
                href: "/admin/transactions",
                key: "transactions",
                icon: "bi-receipt",
            },
            {
                label: "Activity Logs",
                href: "/admin/activity-logs",
                key: "activity-logs",
                icon: "bi-clock-history",
            },
        ],
    },
];

export default function Sidebar({ active = "dashboard" }) {
    const { props } = usePage();
    const user = props.auth?.user;

    return (
        <aside
            className="bg-white border-end min-vh-100 p-3"
            style={{
                fontFamily: "Outfit, sans-serif",
            }}
        >
            <div className="d-flex align-items-center gap-2 mb-3">
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
                    <div className="small text-muted">SECUREVIEW ADMIN</div>
                    <strong className="text-truncate d-block">
                        {user?.name || "Administrator"}
                    </strong>
                </div>
            </div>

            <hr className="mb-3" />

            <nav aria-label="Admin navigation" className="d-flex flex-column gap-3">
                {menuSections.map((section) => (
                    <section key={section.title}>
                        <div className="px-2 mb-2 small text-uppercase text-muted fw-bold">
                            {section.title}
                        </div>

                        <div className="d-flex flex-column gap-1">
                            {section.items.map((item) => {
                                const isActive = active === item.key;

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={
                                            "btn w-100 text-start d-flex align-items-center gap-2 rounded-2 fw-semibold " +
                                            (isActive
                                                ? "btn-primary shadow-sm"
                                                : "btn-light text-dark border-0")
                                        }
                                        style={{
                                            padding: "0.65rem 0.8rem",
                                        }}
                                    >
                                        <i className={"bi " + item.icon}></i>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </nav>
        </aside>
    );
}
