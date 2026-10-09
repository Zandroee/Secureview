import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { Link, router } from "@inertiajs/react";

function urgencyClass(urgency) {
    if (urgency === "emergency") {
        return "bg-danger-subtle text-danger";
    }

    if (urgency === "urgent") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-success-subtle text-success";
}

function statusClass(status) {
    if (status === "completed") {
        return "bg-success-subtle text-success";
    }

    if (status === "cancelled") {
        return "bg-danger-subtle text-danger";
    }

    if (status === "confirmed") {
        return "bg-info-subtle text-info-emphasis";
    }

    if (status === "in_progress") {
        return "bg-primary-subtle text-primary";
    }

    return "bg-warning-subtle text-warning-emphasis";
}

export default function AdminInquiryDetails({ inquiry }) {
    const updateStatus = (event) => {
        router.patch(
            "/admin/inquiries/" + inquiry.id + "/status",
            {
                status: event.target.value,
            },
            {
                preserveScroll: true,
            }
        );
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="inquiries" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>

                                <h1 className="fw-bold mb-1">
                                    INQUIRY DETAILS
                                </h1>

                                <div className="text-muted small">
                                    {inquiry.inquiry_number} ·{" "}
                                    {inquiry.created_at}
                                </div>
                            </div>

                            <Link
                                href="/admin/inquiries"
                                className="btn btn-outline-primary fw-bold"
                            >
                                BACK TO INQUIRIES
                            </Link>
                        </div>

                        <div className="row g-3">
                            <div className="col-lg-8">
                                <div
                                    className="bg-white border rounded-3 p-3 p-md-4 mb-3"
                                    style={{
                                        boxShadow:
                                            "0 3px 12px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                                        <div>
                                            <div className="small text-muted">
                                                SERVICE REQUEST
                                            </div>

                                            <div className="fw-bold fs-5">
                                                {inquiry.service_type}
                                            </div>

                                            <div className="small text-muted mt-1">
                                                {inquiry.item_name ||
                                                    "General Service Inquiry"}
                                            </div>
                                        </div>

                                        <div className="text-end">
                                            <div className="small text-muted mb-1">
                                                PRIORITY
                                            </div>

                                            <span
                                                className={
                                                    "badge rounded-pill text-capitalize px-3 py-2 " +
                                                    urgencyClass(
                                                        inquiry.urgency
                                                    )
                                                }
                                            >
                                                {inquiry.urgency}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PREFERRED DATE
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.preferred_date}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PREFERRED TIME
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.preferred_time}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="small text-muted">
                                                ADDRESS
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.street_address},{" "}
                                                {inquiry.city}
                                            </div>
                                        </div>
                                    </div>

                                    {inquiry.notes && (
                                        <div className="mt-4">
                                            <div className="small text-muted">
                                                CUSTOMER NOTES
                                            </div>

                                            <div className="border rounded-3 p-3 mt-1 bg-light">
                                                {inquiry.notes}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="bg-white border rounded-3 p-3 p-md-4"
                                    style={{
                                        boxShadow:
                                            "0 3px 12px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <i className="bi bi-person-lines-fill text-primary"></i>

                                        <h2 className="h5 fw-bold mb-0">
                                            CUSTOMER INFORMATION
                                        </h2>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                FULL NAME
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.customer_name}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PHONE
                                            </div>

                                            <div className="fw-semibold">
                                                {inquiry.customer_phone}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="small text-muted">
                                                EMAIL
                                            </div>

                                            <div className="fw-semibold text-break">
                                                {inquiry.customer_email}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4">
                                <div
                                    className="bg-white border rounded-3 p-3 p-md-4"
                                    style={{
                                        boxShadow:
                                            "0 3px 12px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <div className="small text-primary fw-bold mb-1">
                                        JOB STATUS
                                    </div>

                                    <h2 className="h5 fw-bold mb-3">
                                        Update inquiry status
                                    </h2>

                                    <select
                                        className="form-select mb-3 text-capitalize"
                                        value={inquiry.status}
                                        onChange={updateStatus}
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="confirmed">
                                            Confirmed
                                        </option>

                                        <option value="in_progress">
                                            In Progress
                                        </option>

                                        <option value="completed">
                                            Completed
                                        </option>

                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                    </select>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-3 py-2 " +
                                            statusClass(inquiry.status)
                                        }
                                    >
                                        {inquiry.status.replace("_", " ")}
                                    </span>

                                    {inquiry.item_image && (
                                        <img
                                            src={inquiry.item_image}
                                            alt={inquiry.item_name}
                                            className="img-fluid rounded-3 mt-4"
                                            style={{
                                                width: "100%",
                                                height: "180px",
                                                objectFit: "cover",
                                            }}
                                        />
                                    )}

                                    <div className="small text-muted mt-4">
                                        When the status changes, the customer
                                        receives a notification in SecureView.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}
