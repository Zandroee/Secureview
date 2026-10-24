import { Link, usePage } from "@inertiajs/react";
import { Offcanvas } from "bootstrap";
import { useEffect } from "react";

const menuGroups = [
    [
        { label: "Dashboard", href: "/technician/dashboard", key: "dashboard", icon: "bi-speedometer2" },
    ],
    [
        { label: "My Services", href: "/technician/services", key: "services", icon: "bi-clipboard-check" },
        { label: "Available Jobs", href: "/technician/available-jobs", key: "available-jobs", icon: "bi-people" },
        { label: "Schedule", href: "/technician/schedule", key: "schedule", icon: "bi-calendar3" },
        { label: "Post-Service Records", href: "/technician/post-service-records", key: "post-service-records", icon: "bi-journal-check" },
        { label: "Service History", href: "/technician/service-history", key: "service-history", icon: "bi-clock-history" },
    ],
    [
        { label: "Products", href: "/technician/products", key: "products", icon: "bi-camera-video" },
    ],
];

export default function TechnicianSidebar({ active = "dashboard", mobileOnly = false, desktopOnly = false } = {}) {
    const { props } = usePage();
    const user = props.auth?.user;
    const sidebarId = "technicianSidebarOffcanvas";

    const getMobileSidebar = () => document.getElementById(sidebarId);
    const getMobileSidebarInstance = () => {
        const menu = getMobileSidebar();
        return menu ? Offcanvas.getOrCreateInstance(menu, { backdrop: true, keyboard: true, scroll: false }) : null;
    };

    const closeMobileSidebar = () => {
        const menu = getMobileSidebar();
        if (menu?.classList.contains("show")) getMobileSidebarInstance()?.hide();
    };

    useEffect(() => {
        const menu = getMobileSidebar();
        if (!menu) return undefined;

        const cleanup = () => {
            window.requestAnimationFrame(() => {
                const anotherOffcanvasIsOpen = Array.from(document.querySelectorAll(".offcanvas"))
                    .some((element) => element !== menu && element.classList.contains("show"));
                const modalIsOpen = Boolean(document.querySelector(".modal.show"));
                if (menu.classList.contains("show") || anotherOffcanvasIsOpen || modalIsOpen) return;
                document.querySelectorAll(".offcanvas-backdrop").forEach((backdrop) => backdrop.remove());
                document.body.classList.remove("offcanvas-open");
                document.body.style.removeProperty("overflow");
                document.body.style.removeProperty("padding-right");
            });
        };

        menu.addEventListener("hidden.bs.offcanvas", cleanup);
        return () => menu.removeEventListener("hidden.bs.offcanvas", cleanup);
    }, []);

    const renderIdentity = () => (
        <div className="d-flex align-items-center gap-2 mb-4">
            <div className="bg-primary rounded-circle d-flex justify-content-center align-items-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                <i className="bi bi-person-workspace text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="small text-muted">TECHNICIAN</div>
                <strong className="text-truncate d-block">{user?.name || "Technician"}</strong>
            </div>
        </div>
    );

    const renderNavigation = (mobile = false) => (
        <nav aria-label="Technician navigation">
            {menuGroups.map((group, groupIndex) => (
                <div key={group[0].key}>
                    {groupIndex > 0 && <hr className="my-2" style={{ borderTop: "1px solid #dfe3e8", opacity: 1 }} />}
                    <div className="d-flex flex-column gap-2">
                        {group.map((item) => {
                            const isActive = active === item.key;
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={"btn text-start rounded-2 fw-semibold " + (isActive ? "btn-primary" : "btn-light")}
                                    onClick={mobile ? closeMobileSidebar : undefined}
                                >
                                    <i className={"bi " + item.icon + " me-2"} aria-hidden="true" />
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
            {!desktopOnly && (
                <>
                    <div className="admin-mobile-sidebar-toggle d-xl-none bg-white border-bottom px-3 py-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary fw-semibold"
                            onClick={() => getMobileSidebarInstance()?.show()}
                            aria-controls={sidebarId}
                            aria-label="Open technician navigation"
                        >
                            <i className="bi bi-list me-2" aria-hidden="true" />
                            Technician menu
                        </button>
                    </div>

                    <div className="offcanvas offcanvas-start d-xl-none" tabIndex={-1} id={sidebarId} aria-labelledby="technicianSidebarOffcanvasLabel">
                        <div className="offcanvas-header border-bottom">
                            <h2 className="offcanvas-title h5 fw-bold mb-0" id="technicianSidebarOffcanvasLabel">SecureView Technician</h2>
                            <button type="button" className="btn-close" onClick={closeMobileSidebar} aria-label="Close technician navigation" />
                        </div>
                        <div className="offcanvas-body p-0">
                            <aside className="bg-white p-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {renderIdentity()}
                                <hr />
                                {renderNavigation(true)}
                            </aside>
                        </div>
                    </div>
                </>
            )}

            {!mobileOnly && (
                <aside className="admin-sidebar-desktop d-none d-xl-block bg-white border-end min-vh-100 p-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {renderIdentity()}
                    <hr />
                    {renderNavigation()}
                </aside>
            )}
        </>
    );
}
