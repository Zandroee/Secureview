import { Link, usePage } from "@inertiajs/react";

const items = [
    { label: "My Jobs", href: "/staff/jobs", key: "jobs", icon: "bi-calendar2-check" },
    { label: "Inventory", href: "/staff/inventory", key: "inventory", icon: "bi-box-seam" },
    { label: "Notifications", href: "/notifications", key: "notifications", icon: "bi-bell" },
];

export default function StaffSidebar({ active = "jobs" }) {
    const { props } = usePage();
    const user = props.auth?.user;

    return (
        <aside className="bg-white border-end min-vh-100 p-3" style={{ fontFamily: "Outfit, sans-serif" }}>
            <div className="d-flex align-items-center gap-2 mb-4">
                <div className="bg-primary rounded-circle d-flex justify-content-center align-items-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                    <i className="bi bi-person-workspace text-white" />
                </div>
                <div className="min-w-0">
                    <div className="small text-muted">STAFF WORKSPACE</div>
                    <strong className="text-truncate d-block">{user?.name || "Technician"}</strong>
                    <span className="small text-muted text-capitalize">{user?.role || "technician"}</span>
                </div>
            </div>
            <hr />
            <nav aria-label="Staff navigation" className="d-flex flex-column gap-2">
                {items.map((item) => (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active === item.key ? "page" : undefined}
                        className={"btn text-start rounded-2 fw-semibold " + (active === item.key ? "btn-primary" : "btn-light")}
                    >
                        <i className={"bi " + item.icon + " me-2"} />
                        {item.label}
                    </Link>
                ))}
            </nav>
            <hr />
            <p className="small text-muted mb-0">
                Access is limited to job work, eligible self-assignment, and inventory quantity updates.
            </p>
        </aside>
    );
}
