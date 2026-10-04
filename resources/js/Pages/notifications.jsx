import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

function iconForType(type) {
    if (type === "payment_paid") return "bi bi-credit-card";
    if (type === "order") return "bi bi-bag-check";
    if (type === "inquiry") return "bi bi-chat-left-text";
    if (type === "schedule") return "bi bi-calendar-check";
    return "bi bi-bell";
}

function iconBackground(type) {
    if (type === "payment_paid") return "#eaf8f0";
    if (type === "order") return "#edf5ff";
    if (type === "inquiry") return "#fff6e8";
    if (type === "schedule") return "#f1edff";
    return "#f2f2f4";
}

export default function Notifications({ notifications = [] }) {
    const { props } = usePage();
    const [working, setWorking] = useState(false);

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
        <div>
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

                        {notifications.length === 0 ? (
                            <div
                                className="border rounded-3 p-5 text-center"
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
                                        className="w-100 text-start border rounded-3 p-3"
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
