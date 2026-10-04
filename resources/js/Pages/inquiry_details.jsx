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

export default function InquiryDetails({ inquiry, success }) {
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
                                INQUIRY DETAILS
                            </h1>

                            <div className="text-muted">
                                {inquiry.inquiry_number} · {inquiry.created_at}
                            </div>
                        </div>

                        <Link
                            href="/inquiries"
                            className="btn btn-outline-primary fw-bold"
                        >
                            BACK TO INQUIRIES
                        </Link>
                    </div>

                    {success && (
                        <div className="alert alert-success">
                            {success}
                        </div>
                    )}

                    <div className="row g-4">
                        <div className="col-lg-8">
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 mb-4"
                                style={{
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4
                                        className="fw-bold mb-0"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        SERVICE REQUEST
                                    </h4>

                                    <span
                                        className={
                                            "badge rounded-pill px-3 py-2 " +
                                            statusClass(inquiry.status)
                                        }
                                    >
                                        {inquiry.status.replace(/_/g, " ")}
                                    </span>
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

                                    <div className="fw-bold fs-5">
                                        {inquiry.item_name ||
                                            "General Service Inquiry"}
                                    </div>

                                    <div className="small text-muted mt-2">
                                        Preferred Date
                                    </div>

                                    <div className="fw-semibold">
                                        {inquiry.preferred_date}
                                    </div>

                                    {inquiry.item_image && (
                                        <img
                                            src={inquiry.item_image}
                                            alt={inquiry.item_name}
                                            className="rounded-3 mt-3"
                                            style={{
                                                width: "110px",
                                                height: "90px",
                                                objectFit: "cover",
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            <div
                                className="bg-white border rounded-4 p-3 p-md-4"
                                style={{
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <h4
                                    className="fw-bold mb-4"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    CUSTOMER INFORMATION
                                </h4>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="small text-muted mb-1">
                                            FULL NAME
                                        </div>

                                        <div className="fw-semibold">
                                            {inquiry.customer_name}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="small text-muted mb-1">
                                            PHONE
                                        </div>

                                        <div className="fw-semibold">
                                            {inquiry.customer_phone}
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="small text-muted mb-1">
                                            EMAIL
                                        </div>

                                        <div className="fw-semibold">
                                            {inquiry.customer_email}
                                        </div>
                                    </div>

                                    <div className="col-md-7">
                                        <div className="small text-muted mb-1">
                                            STREET ADDRESS
                                        </div>

                                        <div className="fw-semibold">
                                            {inquiry.street_address}
                                        </div>
                                    </div>

                                    <div className="col-md-5">
                                        <div className="small text-muted mb-1">
                                            CITY
                                        </div>

                                        <div className="fw-semibold">
                                            {inquiry.city}
                                        </div>
                                    </div>

                                    {inquiry.notes && (
                                        <div className="col-12">
                                            <div className="small text-muted mb-1">
                                                ADDITIONAL NOTES
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.notes}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4 sticky-lg-top"
                                style={{
                                    top: "20px",
                                    boxShadow:
                                        "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <h4
                                    className="fw-bold mb-4"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    INQUIRY SUMMARY
                                </h4>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Inquiry Number
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {inquiry.inquiry_number}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Service
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {inquiry.service_type}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">
                                        Preferred Date
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {inquiry.preferred_date}
                                    </span>
                                </div>

                                <hr />

                                <div
                                    className="rounded-3 p-3"
                                    style={{
                                        backgroundColor: "#eef7ff",
                                    }}
                                >
                                    <div className="fw-bold small mb-2">
                                        <i className="bi bi-info-circle text-primary me-2"></i>
                                        WHAT HAPPENS NEXT?
                                    </div>

                                    <div className="small text-muted">
                                        Our team can review your inquiry and
                                        contact you regarding availability,
                                        scheduling, and the next steps.
                                    </div>
                                </div>

                                <Link
                                    href="/inquiry"
                                    className="btn btn-outline-primary fw-bold w-100 mt-3"
                                >
                                    NEW INQUIRY
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
