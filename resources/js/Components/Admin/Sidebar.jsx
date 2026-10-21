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
            label: "Settings",
            href: "/settings",
            key: "settings",
            icon: "bi-gear",
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

    const renderUserIdentity = () => (
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
    );

    const renderNavigation = (mobile = false) => (
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
                                    data-bs-dismiss={mobile ? "offcanvas" : undefined}
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
    );

    return (
        <>
            <div className="admin-mobile-sidebar-toggle d-xl-none bg-white border-bottom px-3 py-2">
                <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#adminSidebarOffcanvas"
                    aria-controls="adminSidebarOffcanvas"
                    aria-label="Open admin navigation"
                >
                    <i className="bi bi-list me-2" aria-hidden="true"></i>
                    Admin menu
                </button>
            </div>

            <div
                className="offcanvas offcanvas-start d-xl-none"
                tabIndex={-1}
                id="adminSidebarOffcanvas"
                aria-labelledby="adminSidebarOffcanvasLabel"
            >
                <div className="offcanvas-header border-bottom">
                    <h2 className="offcanvas-title h5 fw-bold mb-0" id="adminSidebarOffcanvasLabel">
                        SecureView Admin
                    </h2>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close admin navigation"
                    ></button>
                </div>

                <div className="offcanvas-body p-0">
                    <aside className="bg-white p-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {renderUserIdentity()}
                        <hr />
                        {renderNavigation(true)}
                    </aside>
                </div>
            </div>

            <aside
                className="admin-sidebar-desktop d-none d-xl-block bg-white border-end min-vh-100 p-3"
                style={{
                    fontFamily: "Outfit, sans-serif",
                }}
            >
                {renderUserIdentity()}
                <hr />
                {renderNavigation()}
            </aside>
        </>
    );
}
