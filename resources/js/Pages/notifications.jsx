import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

function iconForType(type) {
    if (type === "announcement") return "bi bi-megaphone";
    if (type === "payment_paid") return "bi bi-credit-card";
    if (type === "order") return "bi bi-bag-check";
    if (type === "inquiry" || type === "new_inquiry" || type === "reschedule_request") return "bi bi-chat-left-text";
    if (type === "schedule" || type === "job_upcoming" || type.startsWith("job_reminder")) return "bi bi-calendar-check";
    if (type === "job_in_progress") return "bi bi-tools";
    if (type === "job_completed") return "bi bi-check-circle";
    if (type === "job_assignment" || type === "job_assignment_removed" || type === "job_team_updated") return "bi bi-people";
    if (type === "inventory_low_stock") return "bi bi-box-seam";
    return "bi bi-bell";
}

function iconBackground(type) {
    if (type === "payment_paid" || type === "job_completed") return "#eaf8f0";
    if (type === "order" || type === "job_in_progress") return "#edf5ff";
    if (type === "inquiry" || type === "new_inquiry" || type === "reschedule_request" || type === "inventory_low_stock") return "#fff6e8";
    if (type === "schedule" || type.startsWith("job_")) return "#f1edff";
    return "#f2f2f4";
}

export default function Notifications({ notifications = [] }) {
    const { props } = usePage();
    const [working, setWorking] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [announcementWorking, setAnnouncementWorking] = useState(false);
    const isAdmin = props.auth?.user?.role === "admin" || props.auth?.user?.is_admin === true;

    const unreadCount = notifications.filter(
        (notification) => !notification.read
    ).length;

    const openNotification = (notification) => {
        setWorking(true);

        router.post(
            "/notifications/" + notification.id + "/read",
            {},
            {
                preserveScroll: true,
                onFinish: () => setWorking(false),
            }
        );
    };

    const markAll = () => {
        setWorking(true);

        router.post(
            "/notifications/read-all",
            {},
            {
                preserveScroll: true,
                onFinish: () => setWorking(false),
            }
        );
    };

    return (
        <div className="notifications-page">
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f5f6f8",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-4">
                    <div
                        className="bg-white border rounded-3 p-3"
                        style={{
                            boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
                        }}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW
                                </div>

                                <h1
                                    className="fw-bold mb-0"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                        fontSize: "1.1rem",
                                    }}
                                >
                                    NOTIFICATIONS
                                </h1>
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm fw-bold"
                                    onClick={markAll}
                                    disabled={working}
                                >
                                    MARK ALL AS READ
                                </button>
                            )}
                        </div>

                        {props.errors?.notification && (
                            <div className="alert alert-danger small">
                                {props.errors.notification}
                            </div>
                        )}

                        {props.flash?.success && (
                            <div className="alert alert-success small" role="status">
                                {props.flash.success}
                            </div>
                        )}

                        {isAdmin && (
                            <form
                                className="border rounded-3 p-3 mb-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setAnnouncementWorking(true);
                                    router.post(
                                        "/admin/announcements",
                                        { title: announcementTitle, message: announcementMessage },
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setAnnouncementTitle("");
                                                setAnnouncementMessage("");
                                            },
                                            onFinish: () => setAnnouncementWorking(false),
                                        }
                                    );
                                }}
                            >
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="bi bi-megaphone text-primary fs-5" />
                                    <h5 className="fw-bold mb-0">Create announcement</h5>
                                </div>
                                <p className="small text-muted mb-3">
                                    Send an announcement to all customer accounts. It will appear in their Notifications.
                                </p>
                                {props.errors?.announcement && (
                                    <div className="alert alert-danger small">{props.errors.announcement}</div>
                                )}
                                {props.errors?.title && (
                                    <div className="text-danger small mb-2">{props.errors.title}</div>
                                )}
                                <label htmlFor="announcement-title" className="form-label small fw-semibold">Title</label>
                                <input
                                    id="announcement-title"
                                    className={"form-control mb-3" + (props.errors?.title ? " is-invalid" : "")}
                                    value={announcementTitle}
                                    onChange={(event) => setAnnouncementTitle(event.target.value)}
                                    maxLength={120}
                                    required
                                    placeholder="e.g. Holiday service schedule"
                                />
                                <label htmlFor="announcement-message" className="form-label small fw-semibold">Message</label>
                                <textarea
                                    id="announcement-message"
                                    className={"form-control mb-3" + (props.errors?.message ? " is-invalid" : "")}
                                    value={announcementMessage}
                                    onChange={(event) => setAnnouncementMessage(event.target.value)}
                                    maxLength={2000}
                                    rows={3}
                                    required
                                    placeholder="Write the information customers need to know..."
                                />
                                {props.errors?.message && (
                                    <div className="text-danger small mb-2">{props.errors.message}</div>
                                )}
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm fw-semibold"
                                    disabled={announcementWorking || !announcementTitle.trim() || !announcementMessage.trim()}
                                >
                                    {announcementWorking ? "Sending..." : "Send to all customers"}
                                </button>
                            </form>
                        )}

                        {notifications.length === 0 ? (
                            <div
                                className="notification-empty border rounded-3 p-5 text-center"
                                style={{ backgroundColor: "#fafafa" }}
                            >
                                <div
                                    className="mx-auto d-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                        width: "66px",
                                        height: "66px",
                                        backgroundColor: "#edf5ff",
                                    }}
                                >
                                    <i
                                        className="bi bi-bell text-primary"
                                        style={{ fontSize: "1.9rem" }}
                                    ></i>
                                </div>

                                <h5
                                    className="fw-bold mt-3 mb-2"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    NO NOTIFICATIONS
                                </h5>

                                <p className="small text-muted mb-0">
                                    Important updates about your orders and
                                    inquiries will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        className="notification-item w-100 text-start border rounded-3 p-3"
                                        style={{
                                            backgroundColor: notification.read
                                                ? "#fff"
                                                : "#edf5ff",
                                            borderColor: notification.read
                                                ? "#e1e2e4"
                                                : "#b9d7ff",
                                            cursor: "pointer",
                                        }}
                                        onClick={() =>
                                            openNotification(notification)
                                        }
                                        disabled={working}
                                    >
                                        <div className="d-flex gap-3 align-items-start">
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle"
                                                style={{
                                                    width: "42px",
                                                    height: "42px",
                                                    minWidth: "42px",
                                                    backgroundColor:
                                                        iconBackground(
                                                            notification.type
                                                        ),
                                                }}
                                            >
                                                <i
                                                    className={
                                                        iconForType(
                                                            notification.type
                                                        ) + " text-primary"
                                                    }
                                                ></i>
                                            </div>

                                            <div className="flex-grow-1">
                                                <div className="d-flex flex-column flex-md-row justify-content-between gap-1">
                                                    <div className="fw-bold">
                                                        {notification.title}
                                                    </div>

                                                    <small className="text-muted">
                                                        {
                                                            notification.created_at
                                                        }
                                                    </small>
                                                </div>

                                                <div className="small text-muted mt-1">
                                                    {notification.message}
                                                </div>
                                            </div>

                                            {!notification.read && (
                                                <span
                                                    className="rounded-circle bg-primary"
                                                    style={{
                                                        width: "9px",
                                                        height: "9px",
                                                        marginTop: "6px",
                                                    }}
                                                ></span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
