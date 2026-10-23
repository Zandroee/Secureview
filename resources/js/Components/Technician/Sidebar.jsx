import { Link, usePage } from "@inertiajs/react";
import { Offcanvas } from "bootstrap";
import { useEffect } from "react";

const items = [
    { label: "Workspace", href: "/technician/dashboard", key: "dashboard", icon: "bi-speedometer2" },
    { label: "My Service Jobs", href: "/technician/dashboard#my-jobs", key: "jobs", icon: "bi-clipboard2-check" },
    { label: "Available Jobs", href: "/technician/dashboard#available-jobs", key: "available-jobs", icon: "bi-people" },
    { label: "My Schedule", href: "/technician/dashboard#my-schedule", key: "schedule", icon: "bi-calendar3" },
    { label: "Post-Service Records", href: "/technician/dashboard#post-service-records", key: "post-service-records", icon: "bi-journal-check" },
    { label: "Inventory", href: "/technician/dashboard#inventory", key: "inventory", icon: "bi-boxes" },
    { label: "Notifications", href: "/notifications", key: "notifications", icon: "bi-bell" },
];

export default function TechnicianSidebar({ active = "dashboard" }) {
    const { props } = usePage();
    const user = props.auth?.user;

    const openMenu = () => Offcanvas.getOrCreateInstance(document.getElementById("technicianSidebarOffcanvas"))?.show();
    const closeMenu = () => Offcanvas.getInstance(document.getElementById("technicianSidebarOffcanvas"))?.hide();

    useEffect(() => {
        const menu = document.getElementById("technicianSidebarOffcanvas");
        if (!menu) return undefined;
        const closeIfNeeded = () => {
            if (menu.classList.contains("show")) Offcanvas.getInstance(menu)?.hide();
        };
        window.addEventListener("pageshow", closeIfNeeded);
        return () => window.removeEventListener("pageshow", closeIfNeeded);
    }, []);

    const renderMenu = (mobile = false) => (
        <nav aria-label="Technician navigation" className="d-flex flex-column gap-2">
            {items.map((item) => (
                <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active === item.key ? "page" : undefined}
                    onClick={mobile ? closeMenu : undefined}
                    className={"btn text-start rounded-2 fw-semibold " + (active === item.key ? "btn-primary" : "btn-light")}
                >
                    <i className={"bi " + item.icon + " me-2"} aria-hidden="true" />
                    {item.label}
                </Link>
            ))}
        </nav>
    );

    return (
        <>
            <div className="technician-mobile-sidebar-toggle d-xl-none bg-white border-bottom px-3 py-2">
                <button type="button" className="btn btn-outline-primary fw-semibold" onClick={openMenu} aria-controls="technicianSidebarOffcanvas">
                    <i className="bi bi-list me-2" aria-hidden="true" />Technician menu
                </button>
            </div>

            <div className="offcanvas offcanvas-start d-xl-none" tabIndex={-1} id="technicianSidebarOffcanvas" aria-labelledby="technicianSidebarTitle">
                <div className="offcanvas-header border-bottom">
                    <h2 className="offcanvas-title h5 fw-bold mb-0" id="technicianSidebarTitle">SecureView Technician</h2>
                    <button type="button" className="btn-close" onClick={closeMenu} aria-label="Close technician navigation" />
                </div>
                <div className="offcanvas-body p-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}><i className="bi bi-person-gear" /></span>
                        <div className="min-w-0"><div className="small text-muted">TECHNICIAN</div><strong className="text-truncate d-block">{user?.name || "Technician"}</strong></div>
                    </div>
                    {renderMenu(true)}
                </div>
            </div>

            <aside className="technician-sidebar-desktop d-none d-xl-block bg-white border-end p-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                <div className="d-flex align-items-center gap-2 mb-4">
                    <span className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40 }}><i className="bi bi-person-gear" /></span>
                    <div className="min-w-0"><div className="small text-muted">TECHNICIAN</div><strong className="text-truncate d-block">{user?.name || "Technician"}</strong></div>
                </div>
                <hr />
                {renderMenu()}
            </aside>
        </>
    );
}
