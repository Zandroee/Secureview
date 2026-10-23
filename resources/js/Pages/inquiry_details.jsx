import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { ServiceLocationMap } from "../Components/GoogleMaps/ServiceLocation";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function statusClass(status) {
    if (status === "confirmed" || status === "completed") {
        return "bg-success-subtle text-success";
    }

    if (status === "in_progress") {
        return "bg-primary-subtle text-primary";
    }

    if (status === "cancelled") {
        return "bg-danger-subtle text-danger";
    }

    return "bg-warning-subtle text-warning-emphasis";
}

function urgencyClass(urgency) {
    if (urgency === "emergency") {
        return "bg-danger-subtle text-danger";
    }

    if (urgency === "urgent") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-success-subtle text-success";
}

export default function ServiceDetails({ inquiry: service, success }) {
    const [rescheduleDate, setRescheduleDate] = useState(service.reschedule_requested_date || "");
    const [rescheduleTime, setRescheduleTime] = useState(service.reschedule_requested_time || "08:00 AM - 11:00 AM");
    const [rescheduleNote, setRescheduleNote] = useState("");
    const [rescheduleErrors, setRescheduleErrors] = useState({});
    const [rescheduleBusy, setRescheduleBusy] = useState(false);
    const timeSlots = ["08:00 AM - 11:00 AM", "11:00 AM - 02:00 PM", "02:00 PM - 05:00 PM"];
    const submitReschedule = (event) => {
        event.preventDefault();
        setRescheduleBusy(true);
        setRescheduleErrors({});
        router.post("/inquiries/" + service.id + "/reschedule", {
            preferred_date: rescheduleDate,
            preferred_time: rescheduleTime,
            note: rescheduleNote,
        }, {
            preserveScroll: true,
            onError: (errors) => setRescheduleErrors(errors),
            onFinish: () => setRescheduleBusy(false),
        });
    };

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
                                SERVICE DETAILS
                            </h1>

                            <div className="text-muted">
                                {service.inquiry_number} · {service.created_at}
                            </div>
                        </div>

                        <Link
                            href="/inquiries"
                            className="btn btn-outline-primary fw-bold"
                        >
                            BACK TO SERVICES
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
                                            statusClass(service.status)
                                        }
                                    >
                                        {service.status.replace(/_/g, " ")}
                                    </span>
                                </div>

                                <div
                                    className="rounded-3 p-3"
                                    style={{
                                        backgroundColor: "#fafafa",
                                    }}
                                >
                                    <div className="small text-primary text-uppercase fw-bold">
                                        {service.service_type}
                                    </div>

                                    <div className="fw-bold fs-5">
                                        {service.item_name ||
                                            "General Service"}
                                    </div>

                                    <div className="small text-muted mt-3">
                                        Urgency
                                    </div>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize " +
                                            urgencyClass(service.urgency)
                                        }
                                    >
                                        {service.urgency}
                                    </span>

                                    {service.payment_status && service.payment_status !== "not_applicable" && (
                                        <div className="small text-muted mt-3">
                                            Payment Status
                                            <span className={"badge rounded-pill ms-2 text-capitalize " + (service.payment_status === "paid" ? "bg-success-subtle text-success" : service.payment_status === "cancelled" || service.payment_status === "failed" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning-emphasis")}>
                                                {service.payment_status.replaceAll("_", " ")}
                                            </span>
                                            {service.payment_method && <span className="ms-2">({service.payment_method.toUpperCase()})</span>}
                                        </div>
                                    )}

                                    <div className="small text-muted mt-2">
                                        Preferred Date
                                    </div>

                                    <div className="fw-semibold">
                                        {service.preferred_date}
                                    </div>

                                    <div className="small text-muted mt-2">
                                        Preferred Time
                                    </div>

                                    <div className="fw-semibold">
                                        {service.preferred_time}
                                    </div>

                                    {service.status === "confirmed" && (
                                        <div className="mt-3 border rounded-3 p-3 bg-white">
                                            <div className="fw-bold mb-1">Reschedule appointment</div>
                                            <div className="small text-muted mb-3">Your current appointment stays active until a technician or administrator approves the change.</div>
                                            {service.reschedule_request_status === "pending" ? (
                                                <div className="alert alert-warning mb-0">
                                                    Request pending: {service.reschedule_requested_date} · {service.reschedule_requested_time}
                                                </div>
                                            ) : (
                                                <form onSubmit={submitReschedule}>
                                                    <label className="form-label small fw-semibold" htmlFor="reschedule-date">Requested date</label>
                                                    <input id="reschedule-date" type="date" min={new Date().toLocaleDateString("en-CA")} className={"form-control mb-2" + (rescheduleErrors.preferred_date ? " is-invalid" : "")} value={rescheduleDate} required onChange={(event) => setRescheduleDate(event.target.value)} />
                                                    {rescheduleErrors.preferred_date && <div className="invalid-feedback d-block">{rescheduleErrors.preferred_date}</div>}
                                                    <label className="form-label small fw-semibold" htmlFor="reschedule-time">Requested time</label>
                                                    <select id="reschedule-time" className={"form-select mb-2" + (rescheduleErrors.preferred_time ? " is-invalid" : "")} value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)}>
                                                        {timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                                                    </select>
                                                    {rescheduleErrors.preferred_time && <div className="invalid-feedback d-block">{rescheduleErrors.preferred_time}</div>}
                                                    <label className="form-label small fw-semibold" htmlFor="reschedule-note">Reason (optional)</label>
                                                    <textarea id="reschedule-note" className="form-control mb-2" rows="2" maxLength="500" value={rescheduleNote} onChange={(event) => setRescheduleNote(event.target.value)} placeholder="Tell us why you need to reschedule" />
                                                    {rescheduleErrors.reschedule && <div className="alert alert-danger py-2 small">{rescheduleErrors.reschedule}</div>}
                                                    <button type="submit" className="btn btn-outline-primary fw-bold w-100" disabled={rescheduleBusy || !rescheduleDate}>{rescheduleBusy ? "SUBMITTING..." : "REQUEST RESCHEDULE"}</button>
                                                </form>
                                            )}
                                        </div>
                                    )}

                                    <div className="small text-muted mt-2">
                                        Technician
                                    </div>

                                    <div className="fw-semibold">
                                        {(service.technicians ?? []).length
                                            ? service.technicians.map((technician) => technician.name).join(", ")
                                            : "Not assigned yet"}
                                    </div>

                                    {service.item_image && (
                                        <img
                                            src={service.item_image}
                                            alt={service.item_name}
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
                                            {service.customer_name}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="small text-muted mb-1">
                                            PHONE
                                        </div>

                                        <div className="fw-semibold">
                                            {service.customer_phone}
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="small text-muted mb-1">
                                            EMAIL
                                        </div>

                                        <div className="fw-semibold">
                                            {service.customer_email}
                                        </div>
                                    </div>

                                    <div className="col-md-7">
                                        <div className="small text-muted mb-1">
                                            STREET ADDRESS
                                        </div>

                                        <div className="fw-semibold">
                                            {service.street_address}
                                        </div>
                                    </div>

                                    <div className="col-md-5">
                                        <div className="small text-muted mb-1">
                                            CITY
                                        </div>

                                        <div className="fw-semibold">
                                            {service.city}
                                        </div>
                                    </div>

                                    {service.address_details && (
                                        <div className="col-12">
                                            <div className="small text-muted mb-1">HOUSE / UNIT / LANDMARK</div>
                                            <div className="fw-semibold">{service.address_details}</div>
                                        </div>
                                    )}

                                    {(service.street_address || service.city || service.google_place_id || service.service_latitude !== null && service.service_latitude !== undefined) && (
                                        <div className="col-12">
                                            <div className="small text-muted fw-semibold mb-2">SERVICE LOCATION MAP</div>
                                            <ServiceLocationMap
                                                latitude={service.service_latitude}
                                                longitude={service.service_longitude}
                                                placeId={service.google_place_id}
                                                streetAddress={service.street_address}
                                                city={service.city}
                                                addressDetails={service.address_details}
                                            />
                                        </div>
                                    )}

                                    {service.notes && (
                                        <div className="col-12">
                                            <div className="small text-muted mb-1">
                                                ADDITIONAL NOTES
                                            </div>

                                            <div className="fw-semibold">
                                                {service.notes}
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
                                    SERVICE SUMMARY
                                </h4>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Service Number
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {service.inquiry_number}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Service
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {service.service_type}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Preferred Date
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {service.preferred_date}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">
                                        Preferred Time
                                    </span>

                                    <span className="fw-semibold text-end">
                                        {service.preferred_time}
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
                                        Our team can review your service request and
                                        contact you regarding availability,
                                        scheduling, and the next steps.
                                    </div>
                                </div>

                                <Link
                                    href="/service"
                                    className="btn btn-outline-primary fw-bold w-100 mt-3"
                                >
                                    REQUEST ANOTHER SERVICE
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {success && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.45)",
                        zIndex: 2000,
                        padding: "1rem",
                    }}
                >
                    <div
                        className="bg-white rounded-4 border text-center p-4"
                        style={{
                            width: "100%",
                            maxWidth: "360px",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-primary text-decoration-none position-absolute"
                            style={{ top: "10px", right: "12px" }}
                            onClick={() => window.history.back()}
                        >
                            Back
                        </button>

                        <div
                            className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                            style={{
                                width: "58px",
                                height: "58px",
                                backgroundColor: "#eaf8f0",
                            }}
                        >
                            <i
                                className="bi bi-check-lg text-success"
                                style={{ fontSize: "1.6rem" }}
                            ></i>
                        </div>

                        <h4
                            className="fw-bold mb-2"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            Service Request Sent!
                        </h4>

                        <p className="small text-muted mb-3">
                            Your service request has been submitted. We will review
                            your request and contact you regarding the next
                            steps.
                        </p>

                        <Link
                            href="/"
                            className="btn btn-primary btn-sm fw-bold px-4"
                        >
                            HOME
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
