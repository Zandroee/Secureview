import { Link, usePage } from "@inertiajs/react";

const menuGroups = [
    [
        {
            label: "Dashboard",
            href: "/dashboard",
            key: "dashboard",
            icon: "bi-speedometer2",
        },
    ],
    [
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
        {
            label: "Service History",
            href: "/admin/service-history",
            key: "service-history",
            icon: "bi-clock-history",
        },
    ],
    [
        {
            label: "Products",
            href: "/admin/products",
            key: "products",
            icon: "bi-camera-video",
        },
        {
            label: "Warranty",
            href: "/admin/warranty",
            key: "warranty",
            icon: "bi-shield-check",
        },
        {
            label: "Orders",
            href: "/admin/purchases",
            key: "purchases",
            icon: "bi-bag-check",
        },
        {
            label: "Packages",
            href: "/admin/packages",
            key: "packages",
            icon: "bi-box-seam",
        },
    ],
    [
        {
            label: "Users",
            href: "/admin/users",
            key: "users",
            icon: "bi-people",
        },
    ],
    [
        {
            label: "Transaction Records",
            href: "/admin/transactions",
            key: "transactions",
            icon: "bi-receipt",
        },
        {
            label: "Invoice Settings",
            href: "/admin/invoice-settings",
            key: "invoice-settings",
            icon: "bi-file-earmark-text",
        },
        {
            label: "Activity Logs",
            href: "/admin/activity-logs",
            key: "activity-logs",
            icon: "bi-clock-history",
        },
    ],
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

            <nav aria-label="Admin navigation">
                {menuGroups.map((group, groupIndex) => (
                    <div key={group[0].key}>
                        {groupIndex > 0 && (
                            <hr
                                className="my-2"
                                style={{
                                    borderTop: "1px solid #dfe3e8",
                                    opacity: 1,
                                }}
                            />
                        )}

                        <div className="d-flex flex-column gap-2">
                            {group.map((item) => {
                                const isActive = active === item.key;

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={
                                            "btn text-start rounded-2 fw-semibold " +
                                            (isActive ? "btn-primary" : "btn-light")
                                        }
                                    >
                                        <i className={"bi " + item.icon + " me-2"}></i>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
