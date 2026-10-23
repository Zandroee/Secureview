import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { Link, router } from "@inertiajs/react";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { googleMapsSearchUrl } from "../../Components/GoogleMaps/ServiceLocation";
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

function formatStatus(status) {
    return status.replace("_", " ");
}

export default function AdminServices({
    services = [],
    filters = {},
}) {
    const serviceRows = services.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [urgency, setUrgency] = useState(filters.urgency ?? "");

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/inquiries",
            {
                search,
                status,
                urgency,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setUrgency("");

        router.get(
            "/admin/inquiries",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };


    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="services" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>

                                <h1 className="fw-bold mb-0">
                                    SERVICE REQUESTS
                                </h1>

                                <div className="small text-muted mt-1">
                                    Urgent requests are automatically placed
                                    first.
                                </div>
                            </div>

                            <div className="bg-white border rounded-3 px-3 py-2">
                                <span className="small text-muted">
                                    TOTAL SERVICES
                                </span>

                                <div className="fw-bold text-primary">
                                    {services.total ?? serviceRows.length}
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-white border rounded-3 p-3 mb-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <form
                                className="row g-2 align-items-end"
                                onSubmit={applyFilters}
                            >
                                <div className="col-lg-5">
                                    <label className="form-label small fw-semibold mb-1">
                                        SEARCH
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Service number, customer, email, or service"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        STATUS
                                    </label>

                                    <select
                                        className="form-select"
                                        value={status}
                                        onChange={(event) =>
                                            setStatus(event.target.value)
                                        }
                                    >
                                        <option value="">All service statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        URGENCY
                                    </label>

                                    <select
                                        className="form-select"
                                        value={urgency}
                                        onChange={(event) =>
                                            setUrgency(event.target.value)
                                        }
                                    >
                                        <option value="">All urgency</option>
                                        <option value="emergency">
                                            Emergency
                                        </option>
                                        <option value="urgent">
                                            Urgent
                                        </option>
                                        <option value="normal">
                                            Normal
                                        </option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-sm-6 col-lg-2 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary fw-bold"
                                        onClick={clearFilters}
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div
                            className="bg-white border rounded-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">PRIORITY</th>
                                            <th>SERVICE</th>
                                            <th>CUSTOMER</th>
                                            <th>SERVICE</th>
                                            <th>TECHNICIAN</th>
                                            <th>SCHEDULE</th>
                                            <th>STATUS</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {serviceRows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="8"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No service requests found.
                                                </td>
                                            </tr>
                                        ) : (
                                            serviceRows.map((service) => (
                                                <tr key={service.id}>
                                                    <td className="ps-3">
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                urgencyClass(
                                                                    service.urgency
                                                                )
                                                            }
                                                        >
                                                            {
                                                                service.urgency
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="fw-bold small">
                                                            {
                                                                service.inquiry_number
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {service.created_at}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold small">
                                                            {
                                                                service.customer_name
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                service.customer_email
                                                            }
                                                        </div>
                                                        <div className="small text-muted mt-1 text-truncate" title={service.street_address}>
                                                            {service.street_address || service.city || "Location not provided"}
                                                        </div>
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
                                                                <i className="bi bi-map me-1" />Open map
                                                            </a>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold small">
                                                            {
                                                                service.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted text-truncate">
                                                            {service.item_name ||
                                                                "General service"}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="d-flex flex-column gap-1">
                                                            {(service.technicians ?? []).length ? service.technicians.map((technician) => (
                                                                <div key={technician.id} className="small">
                                                                    {technician.name}
                                                                </div>
                                                            )) : <span className="small text-muted">Unassigned</span>}
                                                        </div>

                                                        {service.technician?.email && (
                                                            <div className="small text-muted mt-1">
                                                                {service.technician.email}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="small fw-semibold">
                                                            {
                                                                service.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                service.preferred_time
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                statusClass(service.status)
                                                            }
                                                        >
                                                            {formatStatus(service.status)}
                                                        </span>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <Link
                                                            href={
                                                                "/admin/inquiries/" +
                                                                service.id
                                                            }
                                                            className="btn btn-outline-primary btn-sm fw-bold"
                                                        >
                                                            VIEW
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={services} label="services" insideCard />
                        </div>


                    </main>
                </div>
            </div>

            <Footer />

        </div>
    );
}
