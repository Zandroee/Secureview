import { Link, usePage } from "@inertiajs/react";
import { Offcanvas } from "bootstrap";

const groups = [
    [
        { label: "Workspace", href: "/technician/dashboard", icon: "bi-speedometer2", route: true },
    ],
    [
        { label: "My Services", href: "#my-jobs", icon: "bi-clipboard-check" },
        { label: "Available Team Jobs", href: "#available-jobs", icon: "bi-people" },
        { label: "Service Records", href: "#my-jobs", icon: "bi-journal-check" },
    ],
    [
        { label: "Products & Inventory", href: "#inventory", icon: "bi-camera-video" },
        { label: "Schedule", href: "#technician-calendar", icon: "bi-calendar3" },
    ],
    [
        { label: "Notifications", href: "/notifications", icon: "bi-bell", route: true },
        { label: "Account", href: "/settings", icon: "bi-person-gear", route: true },
    ],
];

function Navigation({ mobile = false, close = () => {} }) {
    return (
        <nav aria-label="Technician navigation" className="d-flex flex-column gap-2">
            {groups.map((group, groupIndex) => (
                <div key={group[0].label}>
                    {groupIndex > 0 && <hr className="my-2" />}
                    <div className="d-flex flex-column gap-2">
                        {group.map((item) => {
                            const className = "btn text-start fw-semibold rounded-2 technician-sidebar-link";
                            return item.route ? (
                                <Link key={item.label} href={item.href} className={className} onClick={close}>
                                    <i className={"bi " + item.icon + " me-2"} aria-hidden="true" />
                                    {item.label}
                                </Link>
                            ) : (
                                <a key={item.label} href={item.href} className={className} onClick={mobile ? close : undefined}>
                                    <i className={"bi " + item.icon + " me-2"} aria-hidden="true" />
                                    {item.label}
                                </a>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function Identity() {
    const { props } = usePage();
    const user = props.auth?.user;

    return (
        <div className="d-flex align-items-center gap-2 mb-4">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                <i className="bi bi-person-workspace" aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="small text-secondary">TECHNICIAN</div>
                <strong className="d-block text-truncate">{user?.name || "Technician"}</strong>
            </div>
        </div>
    );
}

export default function TechnicianSidebar() {
    const close = () => {
        const menu = document.getElementById("technicianSidebarOffcanvas");
        if (menu?.classList.contains("show")) {
            Offcanvas.getOrCreateInstance(menu)?.hide();
        }
    };

    return (
        <>
            <div className="technician-mobile-sidebar-toggle d-xl-none mb-3">
                <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#technicianSidebarOffcanvas"
                    aria-controls="technicianSidebarOffcanvas"
                >
                    <i className="bi bi-list me-2" aria-hidden="true" />Technician menu
                </button>
            </div>

            <aside className="technician-sidebar-desktop d-none d-xl-block border rounded-3 p-3">
                <Identity />
                <hr />
                <Navigation />
            </aside>

            <div className="offcanvas offcanvas-start d-xl-none" tabIndex="-1" id="technicianSidebarOffcanvas" aria-labelledby="technicianSidebarOffcanvasLabel">
                <div className="offcanvas-header border-bottom">
                    <h2 className="offcanvas-title h5 fw-bold mb-0" id="technicianSidebarOffcanvasLabel">Technician menu</h2>
                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close technician menu" />
                </div>
                <div className="offcanvas-body">
                    <Identity />
                    <Navigation mobile close={close} />
                </div>
            </div>
        </>
    );
}
