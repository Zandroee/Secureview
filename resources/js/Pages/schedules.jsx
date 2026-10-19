import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import CustomerSidebar from "../Components/customerSidebar";
import { Link } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "Confirmed") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-success-subtle text-success";
}

export default function Schedules({ schedules = [] }) {
    const [viewing, setViewing] = useState(null);

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
                    <div className="row g-3 align-items-start">
                        <div className="col-lg-3">
                            <CustomerSidebar active="schedules" />
                        </div>

                        <div className="col-lg-8">
                            <div
                                className="bg-white border rounded-3 p-3"
                                style={{
                                    boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h2
                                        className="fw-bold mb-0"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                            fontSize: "1.05rem",
                                        }}
                                    >
                                        ACTIVE SCHEDULES
                                    </h2>

                                    <Link
                                        href="/inquiry"
                                        className="btn btn-primary btn-sm fw-bold"
                                    >
                                        NEW INQUIRY
                                    </Link>
                                </div>

                                {schedules.length === 0 ? (
                                    <div
                                        className="border rounded-3 p-5 text-center"
                                        style={{
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <i
                                            className="bi bi-calendar3 text-primary"
                                            style={{
                                                fontSize: "2.5rem",
                                            }}
                                        ></i>

                                        <h5
                                            className="fw-bold mt-3 mb-2"
                                            style={{
                                                fontFamily:
                                                    "Outfit, sans-serif",
                                            }}
                                        >
                                            NO ACTIVE SCHEDULES
                                        </h5>

                                        <p className="small text-muted mb-3">
                                            Confirmed service schedules will
                                            appear here.
                                        </p>

                                        <Link
                                            href="/inquiry"
                                            className="btn btn-primary btn-sm fw-bold px-4"
                                        >
                                            BOOK A SERVICE
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {schedules.map((schedule) => (
                                            <div
                                                key={schedule.id}
                                                className="border rounded-3 p-2"
                                                style={{
                                                    boxShadow:
                                                        "0 2px 6px rgba(0,0,0,0.08)",
                                                }}
                                            >
                                                <div className="row align-items-center g-2">
                                                    <div className="col-md-5">
                                                        <div className="small text-muted">
                                                            Receipt ID:{" "}
                                                            <strong className="text-dark">
                                                                {
                                                                    schedule.receipt_id
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="small mt-1">
                                                            DATE:{" "}
                                                            <strong>
                                                                {
                                                                    schedule.date
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="small">
                                                            TIME:{" "}
                                                            <strong>
                                                                {
                                                                    schedule.time
                                                                }
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-4">
                                                        <div className="small text-muted">
                                                            SERVICE TYPE
                                                        </div>

                                                        <div className="fw-semibold small">
                                                            {
                                                                schedule.service_type
                                                            }
                                                        </div>

                                                        <div className="small mt-1">
                                                            STATUS:{" "}
                                                            <span
                                                                className={
                                                                    "badge rounded-pill px-2 py-1 " +
                                                                    statusClass(
                                                                        schedule.status
                                                                    )
                                                                }
                                                            >
                                                                {
                                                                    schedule.status
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="d-grid gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm fw-bold"
                                                                onClick={() =>
                                                                    setViewing(
                                                                        schedule
                                                                    )
                                                                }
                                                            >
                                                                VIEW ITEMS
                                                            </button>

                                                            <Link
                                                                href={
                                                                    "/inquiries/" +
                                                                    schedule.id
                                                                }
                                                                className="btn btn-outline-primary btn-sm fw-bold"
                                                            >
                                                                VIEW INQUIRY
                                                            </Link>

                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm fw-bold"
                                                                disabled
                                                                title="Schedule cancellation will be connected later."
                                                            >
                                                                CANCEL
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="d-flex justify-content-center gap-1 mt-3">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                        disabled
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-primary rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                    >
                                        1
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border rounded-circle"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            padding: 0,
                                        }}
                                        disabled
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {viewing && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.4)",
                        zIndex: 2000,
                        padding: "1rem",
                    }}
                    onClick={() => setViewing(null)}
                >
                    <div
                        className="bg-white rounded-4 border p-3"
                        style={{
                            width: "100%",
                            maxWidth: "520px",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4
                                className="fw-bold mb-0"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                                ITEMS
                            </h4>

                            <button
                                type="button"
                                className="btn btn-link btn-sm text-primary text-decoration-none"
                                onClick={() => setViewing(null)}
                            >
                                Back
                            </button>
                        </div>

                        <div className="border rounded-3 p-2">
                            <div className="d-flex gap-3 align-items-center">
                                {viewing.item_image ? (
                                    <img
                                        src={viewing.item_image}
                                        alt={viewing.item_name}
                                        className="rounded-2"
                                        style={{
                                            width: "70px",
                                            height: "70px",
                                            objectFit: "cover",
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                        style={{
                                            width: "70px",
                                            height: "70px",
                                        }}
                                    >
                                        <i className="bi bi-camera-video text-secondary"></i>
                                    </div>
                                )}

                                <div className="flex-grow-1">
                                    <div className="small text-primary text-uppercase fw-bold">
                                        {viewing.item_type}
                                    </div>

                                    <div className="fw-bold">
                                        {viewing.item_name ||
                                            "General Service"}
                                    </div>

                                    <div className="small text-muted">
                                        {viewing.service_type}
                                    </div>
                                </div>

                                <Link
                                    href={"/inquiries/" + viewing.id}
                                    className="btn btn-primary btn-sm fw-bold"
                                >
                                    DETAILS
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
