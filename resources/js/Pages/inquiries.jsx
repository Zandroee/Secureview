import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
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
                    backgroundColor: "#f7f7f8",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-4 py-md-5">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                            <div className="small text-uppercase fw-bold text-primary mb-1">
                                SecureView
                            </div>

                            <h1
                                className="fw-bold mb-1"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                }}
                            >
                                MY INQUIRIES
                            </h1>

                            <p className="text-muted mb-0">
                                Track your service inquiries and requested dates.
                            </p>
                        </div>

                        <Link
                            href="/inquiry"
                            className="btn btn-primary fw-bold"
                        >
                            NEW INQUIRY
                        </Link>
                    </div>

                    {inquiries.length === 0 ? (
                        <div className="bg-white border rounded-4 p-5 text-center">
                            <div
                                className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    backgroundColor: "#edf5ff",
                                }}
                            >
                                <i
                                    className="bi bi-chat-left-text text-primary"
                                    style={{ fontSize: "2rem" }}
                                ></i>
                            </div>

                            <h3
                                className="fw-bold mb-2"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                }}
                            >
                                No inquiries yet
                            </h3>

                            <p className="text-muted mb-4">
                                Your submitted service inquiries will appear here.
                            </p>

                            <Link
                                href="/inquiry"
                                className="btn btn-primary fw-bold px-4"
                            >
                                MAKE AN INQUIRY
                            </Link>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {inquiries.map((inquiry) => (
                                <div
                                    key={inquiry.id}
                                    className="bg-white border rounded-4 p-3 p-md-4"
                                    style={{
                                        boxShadow:
                                            "0 8px 24px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                                        <div>
                                            <div className="small text-muted">
                                                INQUIRY NUMBER
                                            </div>

                                            <div
                                                className="fw-bold"
                                                style={{
                                                    fontFamily:
                                                        "Outfit, sans-serif",
                                                }}
                                            >
                                                {inquiry.inquiry_number}
                                            </div>

                                            <div className="small text-muted mt-1">
                                                {inquiry.created_at}
                                            </div>
                                        </div>

                                        <div className="text-md-end">
                                            <div className="small text-muted">
                                                PREFERRED DATE
                                            </div>

                                            <div className="fw-bold">
                                                {inquiry.preferred_date}
                                            </div>

                                            <div className="small text-muted">
                                                {inquiry.preferred_time}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-3 p-3"
                                        style={{
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <div className="small text-primary text-uppercase fw-bold">
                                            {inquiry.service_type}
                                        </div>

                                        <div className="fw-bold">
                                            {inquiry.item_name ||
                                                "General Service Inquiry"}
                                        </div>

                                        <div className="small text-muted mt-1">
                                            {inquiry.city}
                                        </div>
                                    </div>

                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 pt-3 border-top">
                                        <span
                                            className={
                                                "badge rounded-pill px-3 py-2 " +
                                                statusClass(inquiry.status)
                                            }
                                        >
                                            Status:{" "}
                                            {inquiry.status.replace(/_/g, " ")}
                                        </span>

                                        <Link
                                            href={"/inquiries/" + inquiry.id}
                                            className="btn btn-outline-primary fw-bold btn-sm"
                                        >
                                            VIEW DETAILS
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
