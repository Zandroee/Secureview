import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import CustomerSidebar from "../Components/customerSidebar";
import { Link } from "@inertiajs/react";

function statusClass(status) {
    if (status === "confirmed" || status === "completed") {
        return "bg-success-subtle text-success";
    }

    if (status === "cancelled") {
        return "bg-danger-subtle text-danger";
    }

    return "bg-warning-subtle text-warning-emphasis";
}

export default function Inquiries({ inquiries = [] }) {
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
                            <CustomerSidebar active="inquiries" />
                        </div>

                        <div className="col-lg-8">
                            <div
                                className="bg-white border rounded-3 p-3"
                                style={{
                                    boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <div className="small text-primary fw-bold">
                                            SECUREVIEW
                                        </div>

                                        <h2
                                            className="fw-bold mb-0"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "1.05rem",
                                            }}
                                        >
                                            INQUIRY HISTORY
                                        </h2>
                                    </div>

                                    <Link
                                        href="/inquiry"
                                        className="btn btn-primary btn-sm fw-bold"
                                    >
                                        NEW INQUIRY
                                    </Link>
                                </div>

                                {inquiries.length === 0 ? (
                                    <div
                                        className="border rounded-3 p-5 text-center"
                                        style={{
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <i
                                            className="bi bi-chat-left-text text-primary"
                                            style={{ fontSize: "2.5rem" }}
                                        ></i>

                                        <h5
                                            className="fw-bold mt-3 mb-2"
                                            style={{
                                                fontFamily:
                                                    "Outfit, sans-serif",
                                            }}
                                        >
                                            NO INQUIRIES YET
                                        </h5>

                                        <p className="small text-muted mb-3">
                                            Your submitted service inquiries
                                            will appear here.
                                        </p>

                                        <Link
                                            href="/inquiry"
                                            className="btn btn-primary btn-sm fw-bold px-4"
                                        >
                                            MAKE AN INQUIRY
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {inquiries.map((inquiry) => (
                                            <div
                                                key={inquiry.id}
                                                className="border rounded-3 p-2"
                                                style={{
                                                    boxShadow:
                                                        "0 2px 6px rgba(0,0,0,0.08)",
                                                }}
                                            >
                                                <div className="row align-items-center g-2">
                                                    <div className="col-md-4">
                                                        <div className="small">
                                                            <strong>
                                                                Inquiry ID:
                                                            </strong>{" "}
                                                            {
                                                                inquiry.inquiry_number
                                                            }
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            DATE:{" "}
                                                            {
                                                                inquiry.created_at?.split(
                                                                    " "
                                                                )[0]
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            TIME:{" "}
                                                            {
                                                                inquiry.created_at?.split(
                                                                    " "
                                                                )[1]
                                                            }{" "}
                                                            {
                                                                inquiry.created_at?.split(
                                                                    " "
                                                                )[2]
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="small text-muted">
                                                            SERVICE TYPE
                                                        </div>

                                                        <div className="fw-semibold small">
                                                            {
                                                                inquiry.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            ITEM
                                                        </div>

                                                        <div className="fw-semibold small text-truncate">
                                                            {inquiry.item_name ||
                                                                "General Inquiry"}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-2">
                                                        <div className="small text-muted">
                                                            PREFERRED
                                                        </div>

                                                        <div className="fw-semibold small">
                                                            {
                                                                inquiry.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                inquiry.preferred_time
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="d-grid gap-2">
                                                            <span
                                                                className={
                                                                    "badge rounded-pill px-2 py-2 " +
                                                                    statusClass(
                                                                        inquiry.status
                                                                    )
                                                                }
                                                            >
                                                                Status:{" "}
                                                                {inquiry.status.replace(
                                                                    /_/g,
                                                                    " "
                                                                )}
                                                            </span>

                                                            <Link
                                                                href={
                                                                    "/inquiries/" +
                                                                    inquiry.id
                                                                }
                                                                className="btn btn-outline-primary btn-sm fw-bold"
                                                            >
                                                                VIEW DETAILS
                                                            </Link>
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

            <Footer />
        </div>
    );
}
