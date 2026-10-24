import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import ConfirmInquiryModal from "../../Components/Admin/ConfirmInquiryModal";
import ManageTechnicianTeamModal from "../../Components/Admin/ManageTechnicianTeamModal";
import { ServiceLocationMap } from "../../Components/GoogleMaps/ServiceLocation";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

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

export default function AdminInquiryDetails({
    inquiry: service,
    technicians = [],
    technicianBookings = [],
    blockedBookingDates = [],
    blockedBookingTimeSlots = [],
    bookingTimeSlots = [],
    todayDate = "",
    fromSchedule = false,
    fromHistory = false,
}) {
    const [confirming, setConfirming] = useState(false);
    const [managingTeam, setManagingTeam] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState("");
    const [statusSuccess, setStatusSuccess] = useState("");

    const statusOptions = {
        pending: [
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirm & schedule service" },
            { value: "cancelled", label: "Cancel service" },
        ],
        confirmed: [
            { value: "confirmed", label: "Confirmed" },
            { value: "in_progress", label: "In progress" },
            { value: "cancelled", label: "Cancel service" },
        ],
        in_progress: [
            { value: "in_progress", label: "In progress" },
            { value: "completed", label: service.service_record_exists ? "Completed" : "Completed (Post-Service Record required)", disabled: !service.service_record_exists },
            { value: "cancelled", label: "Cancel service" },
        ],
        completed: [{ value: "completed", label: "Completed" }],
        cancelled: [{ value: "cancelled", label: "Cancelled" }],
    };
    const allowedStatusOptions = statusOptions[service.status] ?? [{ value: service.status, label: service.status }];

    const updateStatus = (event) => {
        const nextStatus = event.target.value;
        setStatusError("");
        setStatusSuccess("");

        if (nextStatus === service.status) return;
        if (nextStatus === "confirmed" && service.status !== "confirmed") {
            setConfirming(true);
            return;
        }

        if (nextStatus === "cancelled" && !window.confirm("Cancel this service request? The customer and assigned technicians will be notified.")) {
            return;
        }

        setUpdatingStatus(true);
        router.patch(
            "/admin/inquiries/" + service.id + "/status",
            { status: nextStatus },
            {
                preserveScroll: true,
                onError: (validationErrors) => setStatusError(validationErrors.status ?? "Unable to update service status."),
                onSuccess: () => {
                    setStatusSuccess("Service status updated successfully.");
                    if (fromSchedule && nextStatus === "completed") {
                        router.visit("/admin/service-history");
                    }
                },
                onFinish: () => setUpdatingStatus(false),
            }
        );
    };

    const backHref = fromHistory
        ? "/admin/service-history"
        : fromSchedule
            ? "/admin/schedules"
            : "/admin/inquiries";
    const backLabel = fromHistory
        ? "BACK TO SERVICE HISTORY"
        : fromSchedule
            ? "BACK TO SCHEDULED SERVICES"
            : "BACK TO SERVICES";
    const pageTitle = fromHistory
        ? "SERVICE HISTORY DETAILS"
        : fromSchedule
            ? "SCHEDULED SERVICE DETAILS"
            : "SERVICE DETAILS";
    const activeSection = fromHistory
        ? "service-history"
        : fromSchedule
            ? "schedules"
            : "services";


    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active={activeSection} />
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
                                    {pageTitle}
                                </h1>

                                <div className="text-muted small">
                                    {service.inquiry_number} ·{" "}
                                    {service.created_at}
                                </div>
                            </div>

                            <Link
                                href={backHref}
                                className="btn btn-outline-primary fw-bold"
                            >
                                {backLabel}
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
                                                {service.service_type}
                                            </div>

                                            <div className="small text-muted mt-1">
                                                {service.item_name ||
                                                    "General Service"}
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
                                                        service.urgency
                                                    )
                                                }
                                            >
                                                {service.urgency}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PREFERRED DATE
                                            </div>

                                            <div className="fw-semibold">
                                                {service.preferred_date}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PREFERRED TIME
                                            </div>

                                            <div className="fw-semibold">
                                                {service.preferred_time}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="small text-muted">
                                                SERVICE ADDRESS
                                            </div>

                                            <div className="fw-semibold">
                                                {service.street_address}, {service.city}
                                            </div>
                                            {service.address_details && (
                                                <div className="small text-muted mt-1">
                                                    <span className="fw-semibold">House / Unit / Landmark:</span> {service.address_details}
                                                </div>
                                            )}
                                        </div>

                                        {(service.street_address || service.city || service.google_place_id || service.service_latitude !== null && service.service_latitude !== undefined) && (
                                            <div className="col-12">
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
                                    </div>

                                    {service.notes && (
                                        <div className="mt-4">
                                            <div className="small text-muted">
                                                CUSTOMER NOTES
                                            </div>

                                            <div className="border rounded-3 p-3 mt-1 bg-light">
                                                {service.notes}
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
                                                {service.customer_name}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="small text-muted">
                                                PHONE
                                            </div>

                                            <div className="fw-semibold">
                                                {service.customer_phone}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="small text-muted">
                                                EMAIL
                                            </div>

                                            <div className="fw-semibold text-break">
                                                {service.customer_email}
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
                                        TECHNICIAN ASSIGNMENT
                                    </div>

                                    <h2 className="h5 fw-bold mb-3">
                                        Technician Team
                                    </h2>

                                    <div className="d-flex flex-column gap-2 mb-3">
                                        {(service.technicians ?? []).length > 0 ? service.technicians.map((technician) => (
                                            <div key={technician.id} className="d-flex align-items-center justify-content-between gap-2 border rounded-3 p-2">
                                                <div>
                                                    <div className="fw-semibold">{technician.name}</div>
                                                    <div className="small text-muted">{technician.email}</div>
                                                </div>
                                            </div>
                                        )) : <div className="small text-muted">No technicians assigned yet.</div>}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary w-100 fw-semibold mb-4"
                                        onClick={() => setManagingTeam(true)}
                                    >
                                        MANAGE TECHNICIAN TEAM
                                    </button>

                                    <div className="small text-muted mb-4">
                                        Upcoming confirmed jobs appear automatically to eligible technicians. They can join only if their schedule is free and the team has room.
                                    </div>

                                    <div className="small text-primary fw-bold mb-1">
                                        JOB STATUS
                                    </div>

                                    <h2 className="h5 fw-bold mb-3">
                                        Update service status
                                    </h2>

                                    <select
                                        id="service-status"
                                        className="form-select mb-2 text-capitalize"
                                        value={service.status}
                                        onChange={updateStatus}
                                        disabled={updatingStatus}
                                        aria-label="Update service status"
                                    >
                                        {allowedStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value} disabled={Boolean(option.disabled)}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    {updatingStatus && (
                                        <div className="small text-primary mb-2" role="status">
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Saving status and notifying the customer…
                                        </div>
                                    )}
                                    {statusError && <div className="alert alert-danger py-2 small mb-2" role="alert">{statusError}</div>}
                                    {statusSuccess && <div className="alert alert-success py-2 small mb-2" role="status">{statusSuccess}</div>}
                                    <div className="small text-muted mb-3">
                                        {service.status === "pending"
                                            ? "Confirm & schedule opens the date availability and technician assignment step."
                                            : service.status === "confirmed"
                                                ? "Start the service when the technicians are ready. Cancel only if the job will not proceed."
                                                : service.status === "in_progress" && !service.service_record_exists
                                                    ? "A Post-Service Record must be saved before this service can be marked completed."
                                                    : service.status === "in_progress"
                                                        ? "The Post-Service Record is saved, so the service can be completed."
                                                        : "This service is in a final state and cannot be reopened here."}
                                    </div>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-3 py-2 " +
                                            statusClass(service.status)
                                        }
                                    >
                                        {service.status.replace("_", " ")}
                                    </span>

                                    {service.item_image && (
                                        <img
                                            src={service.item_image}
                                            alt={service.item_name}
                                            className="img-fluid rounded-3 mt-4"
                                            style={{
                                                width: "100%",
                                                height: "180px",
                                                objectFit: "cover",
                                            }}
                                        />
                                    )}

                                    <div className="small text-muted mt-4">
                                        Status and technician assignment changes
                                        notify the customer in SecureView.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Footer />

            {confirming && (
                <ConfirmInquiryModal
                    inquiry={service}
                    technicians={technicians}
                    technicianBookings={technicianBookings}
                    blockedBookingDates={blockedBookingDates}
                    blockedBookingTimeSlots={blockedBookingTimeSlots}
                    bookingTimeSlots={bookingTimeSlots}
                    todayDate={todayDate}
                    onClose={() => setConfirming(false)}
                />
            )}

            {managingTeam && (
                <ManageTechnicianTeamModal
                    inquiry={service}
                    technicians={technicians}
                    onClose={() => setManagingTeam(false)}
                />
            )}
        </div>
    );
}
