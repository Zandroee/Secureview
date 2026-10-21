import { Link } from "@inertiajs/react";

const items = [
    {
        key: "settings",
        label: "ACCOUNT SETTINGS",
        href: "/settings",
        icon: "bi bi-gear",
    },
    {
        key: "schedules",
        label: "ACTIVE SCHEDULES",
        href: "/schedules",
        icon: "bi bi-calendar3",
    },
    {
        key: "inquiries",
        label: "INQUIRY HISTORY",
        href: "/inquiries",
        icon: "bi bi-chat-left-text",
    },
    {
        key: "purchases",
        label: "PURCHASE HISTORY",
        href: "/purchases",
        icon: "bi bi-clock-history",
    },
    {
        key: "warranty",
        label: "WARRANTY CLAIMS",
        href: "/warranty-claims",
        icon: "bi bi-shield-check",
    },
];

export default function CustomerSidebar({ active }) {
    const renderLinks = (mobile = false) => (
        <nav aria-label="Customer account navigation" className="d-flex flex-column gap-1">
            {items.map((item) => {
                const selected = active === item.key;

                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={selected ? "page" : undefined}
                        data-bs-dismiss={mobile ? "offcanvas" : undefined}
                        className={
                            "d-flex align-items-center gap-2 text-decoration-none rounded-pill px-3 py-2 " +
                            (selected ? "bg-primary text-white" : "text-dark")
                        }
                        style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <i className={item.icon} aria-hidden="true"></i>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            <div className="d-lg-none mb-3">
                <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#customerSidebarOffcanvas"
                    aria-controls="customerSidebarOffcanvas"
                    aria-label="Open customer account navigation"
                >
                    <i className="bi bi-list me-2" aria-hidden="true"></i>
                    My Account Menu
                </button>
            </div>

            <div
                className="offcanvas offcanvas-start d-lg-none"
                tabIndex={-1}
                id="customerSidebarOffcanvas"
                aria-labelledby="customerSidebarOffcanvasLabel"
            >
                <div className="offcanvas-header border-bottom">
                    <h2 className="offcanvas-title h5 fw-bold mb-0" id="customerSidebarOffcanvasLabel">
                        My Account
                    </h2>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close account navigation"
                    ></button>
                </div>
                <div className="offcanvas-body p-3">
                    {renderLinks(true)}
                </div>
            </div>

            <aside
                className="customer-sidebar-desktop d-none d-lg-block bg-white border rounded-3 p-2"
                style={{ boxShadow: "0 3px 12px rgba(0,0,0,0.05)" }}
            >
                {renderLinks()}
            </aside>
        </>
    );
}
