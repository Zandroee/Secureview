import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
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

function formatStatus(status) {
    return status.replace("_", " ");
}

export default function AdminInquiries({ inquiries = [], filters = {} }) {
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

    const updateStatus = (inquiry, nextStatus) => {
        router.patch(
            "/admin/inquiries/" + inquiry.id + "/status",
            {
                status: nextStatus,
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
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>

                                <h1 className="fw-bold mb-0">
                                    SERVICE INQUIRIES
                                </h1>

                                <div className="small text-muted mt-1">
                                    Urgent requests are automatically placed
                                    first.
                                </div>
                            </div>

                            <div className="bg-white border rounded-3 px-3 py-2">
                                <span className="small text-muted">
                                    TOTAL INQUIRIES
                                </span>

                                <div className="fw-bold text-primary">
                                    {inquiries.length}
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
                                        placeholder="Inquiry ID, customer, email, or service"
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
                                        <option value="">All statuses</option>
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
                                            <th>INQUIRY</th>
                                            <th>CUSTOMER</th>
                                            <th>SERVICE</th>
                                            <th>SCHEDULE</th>
                                            <th>STATUS</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {inquiries.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No inquiries found.
                                                </td>
                                            </tr>
                                        ) : (
                                            inquiries.map((inquiry) => (
                                                <tr key={inquiry.id}>
                                                    <td className="ps-3">
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                urgencyClass(
                                                                    inquiry.urgency
                                                                )
                                                            }
                                                        >
                                                            {
                                                                inquiry.urgency
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="fw-bold small">
                                                            {
                                                                inquiry.inquiry_number
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {inquiry.created_at}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold small">
                                                            {
                                                                inquiry.customer_name
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                inquiry.customer_email
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold small">
                                                            {
                                                                inquiry.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted text-truncate">
                                                            {inquiry.item_name ||
                                                                "General service"}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="small fw-semibold">
                                                            {
                                                                inquiry.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                inquiry.preferred_time
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm text-capitalize"
                                                            value={inquiry.status}
                                                            onChange={(event) =>
                                                                updateStatus(
                                                                    inquiry,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
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
                                                                "badge rounded-pill mt-1 text-capitalize " +
                                                                statusClass(
                                                                    inquiry.status
                                                                )
                                                            }
                                                        >
                                                            {formatStatus(
                                                                inquiry.status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <Link
                                                            href={
                                                                "/admin/inquiries/" +
                                                                inquiry.id
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
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}
