import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { googleMapsSearchUrl } from "../Components/GoogleMaps/ServiceLocation";
import { Link } from "@inertiajs/react";
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

export default function Inquiries({ inquiries = [] }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [serviceTypeFilter, setServiceTypeFilter] = useState("");
    const [urgencyFilter, setUrgencyFilter] = useState("");
    const filteredInquiries = inquiries.filter((service) => {
        const query = search.trim().toLowerCase();
        const searchable = [service.inquiry_number, service.item_name, service.service_type, service.status]
            .filter(Boolean).join(" ").toLowerCase();
        return (!query || searchable.includes(query))
            && (!statusFilter || service.status === statusFilter)
            && (!serviceTypeFilter || service.service_type === serviceTypeFilter)
            && (!urgencyFilter || service.urgency === urgencyFilter);
    });

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
                        <div className="col-12">
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
                                            SERVICE HISTORY
                                        </h2>
                                    </div>

                                    <Link
                                        href="/service"
                                        className="btn btn-primary btn-sm fw-bold"
                                    >
                                        NEW SERVICE REQUEST
                                    </Link>
                                </div>

                                <div className="row g-2 mb-3">
                                    <div className="col-md-4">
                                        <label className="form-label small fw-semibold" htmlFor="service-history-search">Search services</label>
                                        <input id="service-history-search" type="search" className="form-control form-control-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Service ID, type, item, or status" />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-semibold" htmlFor="service-history-status">Status</label>
                                        <select id="service-history-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                            <option value="">All statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-semibold" htmlFor="service-history-type">Service type</label>
                                        <select id="service-history-type" className="form-select form-select-sm" value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
                                            <option value="">All service types</option>
                                            {Array.from(new Set(inquiries.map((service) => service.service_type).filter(Boolean))).sort().map((type) => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label small fw-semibold" htmlFor="service-history-urgency">Urgency</label>
                                        <select id="service-history-urgency" className="form-select form-select-sm" value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)}>
                                            <option value="">All</option>
                                            <option value="normal">Normal</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                    </div>
                                </div>

                                {filteredInquiries.length === 0 ? (
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
                                            {inquiries.length === 0 ? "NO SERVICE REQUESTS YET" : "NO MATCHING SERVICES"}
                                        </h5>

                                        <p className="small text-muted mb-3">
                                            Your submitted service requests
                                            will appear here.
                                        </p>

                                        <Link
                                            href="/service"
                                            className="btn btn-primary btn-sm fw-bold px-4"
                                        >
                                            REQUEST A SERVICE
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {filteredInquiries.map((service) => (
                                            <div
                                                key={service.id}
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
                                                                Service ID:
                                                            </strong>{" "}
                                                            {
                                                                service.inquiry_number
                                                            }
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            DATE:{" "}
                                                            {
                                                                service.created_date || service.created_at
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            TIME:{" "}
                                                            {
                                                                service.created_at?.split(
                                                                    " "
                                                                )[1]
                                                            }{" "}
                                                            {
                                                                service.created_at?.split(
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
                                                                service.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            URGENCY
                                                        </div>

                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize " +
                                                                urgencyClass(
                                                                    service.urgency
                                                                )
                                                            }
                                                        >
                                                            {service.urgency}
                                                        </span>

                                                        <div className="small text-muted mt-1">
                                                            TECHNICIAN
                                                        </div>

                                                        <div className="fw-semibold small">
                                                            {(service.technicians ?? []).length
                                                                ? service.technicians.map((technician) => technician.name).join(", ")
                                                                : "Not assigned yet"}
                                                        </div>

                                                        <div className="small text-muted mt-1">
                                                            ITEM
                                                        </div>

                                                        <div className="fw-semibold small text-truncate">
                                                            {service.item_name ||
                                                                "General Service"}
                                                        </div>

                                                        {(service.street_address || service.city) && (
                                                            <div className="small text-muted mt-2 text-truncate">
                                                                {service.street_address || service.city}
                                                            </div>
                                                        )}

                                                        {(service.google_place_id || service.service_latitude !== null && service.service_latitude !== undefined || service.street_address || service.city) && (
                                                            <a
                                                                href={googleMapsSearchUrl({
                                                                    latitude: service.service_latitude,
                                                                    longitude: service.service_longitude,
                                                                    placeId: service.google_place_id,
                                                                    streetAddress: service.street_address,
                                                                    city: service.city,
                                                                    addressDetails: service.address_details,
                                                                })}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="small text-decoration-none"
                                                            >
                                                                <i className="bi bi-map me-1" />View service location
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="col-md-2">
                                                        <div className="small text-muted">
                                                            PREFERRED
                                                        </div>

                                                        <div className="fw-semibold small">
                                                            {
                                                                service.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                service.preferred_time
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3">
                                                        <div className="d-grid gap-2">
                                                            <span
                                                                className={
                                                                    "badge rounded-pill px-2 py-2 " +
                                                                    statusClass(
                                                                        service.status
                                                                    )
                                                                }
                                                            >
                                                                Status:{" "}
                                                                {service.status.replace(
                                                                    /_/g,
                                                                    " "
                                                                )}
                                                            </span>

                                                            <Link
                                                                href={
                                                                    "/inquiries/" +
                                                                    service.id
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
