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
];

export default function CustomerSidebar({ active }) {
    return (
        <aside
            className="bg-white border rounded-3 p-2"
            style={{
                boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
            }}
        >
            {items.map((item) => {
                const selected = active === item.key;

                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={
                            "d-flex align-items-center gap-2 text-decoration-none rounded-pill px-3 py-2 mb-1 " +
                            (selected
                                ? "bg-primary text-white"
                                : "text-dark")
                        }
                        style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <i className={item.icon}></i>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </aside>
    );
}
