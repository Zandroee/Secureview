import { Link, usePage } from "@inertiajs/react";

const menuSections = [
    {
        title: "Overview",
        icon: "bi-grid-1x2",
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
        icon: "bi-headset",
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
        icon: "bi-boxes",
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
        icon: "bi-shield-lock",
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
        icon: "bi-clipboard-data",
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
            className="min-vh-100 p-3"
            style={{
                fontFamily: "Outfit, sans-serif",
                backgroundColor: "#f6f8fc",
                borderRight: "1px solid #e2e8f0",
            }}
        >
            <div
                className="d-flex align-items-center gap-2 rounded-3 p-2 mb-3 bg-white"
                style={{ border: "1px solid #e2e8f0" }}
            >
                <div
                    className="bg-primary rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 shadow-sm"
                    style={{
                        width: "42px",
                        height: "42px",
                    }}
                >
                    <i className="bi bi-person text-white fs-5"></i>
                </div>

                <div className="min-w-0">
                    <div
                        className="text-primary fw-bold"
                        style={{
                            fontSize: "0.65rem",
                            letterSpacing: "0.07em",
                        }}
                    >
                        SECUREVIEW ADMIN
                    </div>
                    <strong className="text-truncate d-block">
                        {user?.name || "Administrator"}
                    </strong>
                </div>
            </div>

            <nav
                aria-label="Admin navigation"
                className="d-flex flex-column"
                style={{ gap: "0.85rem" }}
            >
                {menuSections.map((section) => (
                    <section
                        key={section.title}
                        className="p-2 rounded-3 bg-white"
                        style={{
                            border: "1px solid #dfe5ee",
                            boxShadow: "0 2px 5px rgba(15, 23, 42, 0.035)",
                        }}
                    >
                        <div
                            className="d-flex align-items-center gap-2 text-uppercase fw-bold mb-2"
                            style={{
                                color: "#174ea6",
                                backgroundColor: "#eaf2ff",
                                borderLeft: "4px solid #0d6efd",
                                borderRadius: "6px",
                                padding: "0.6rem 0.65rem",
                                fontSize: "0.67rem",
                                letterSpacing: "0.075em",
                            }}
                        >
                            <i className={"bi " + section.icon} />
                            <span>{section.title}</span>
                        </div>

                        <div className="d-flex flex-column" style={{ gap: "0.4rem" }}>
                            {section.items.map((item) => {
                                const isActive = active === item.key;

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={
                                            "btn w-100 text-start d-flex align-items-center gap-2 rounded-2 fw-semibold " +
                                            (isActive ? "btn-primary shadow-sm" : "btn-light")
                                        }
                                        style={{
                                            minHeight: "42px",
                                            padding: "0.6rem 0.7rem",
                                            border: isActive
                                                ? "1px solid #0d6efd"
                                                : "1px solid #e4e9f1",
                                            backgroundColor: isActive ? "#0d6efd" : "#f8fafc",
                                            color: isActive ? "#fff" : "#263449",
                                            fontSize: "0.91rem",
                                        }}
                                    >
                                        <i
                                            className={"bi " + item.icon}
                                            style={{
                                                width: "18px",
                                                fontSize: "1rem",
                                                color: isActive ? "#fff" : "#5d6b82",
                                            }}
                                        />
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
