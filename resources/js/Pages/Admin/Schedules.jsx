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
    if (status === "in_progress") {
        return "bg-primary-subtle text-primary";
    }

    return "bg-info-subtle text-info-emphasis";
}

function statusLabel(status) {
    return status === "in_progress" ? "In Progress" : "Confirmed";
}

export default function AdminSchedules({
    schedules = [],
    technicians = [],
    summary = {},
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");
    const [technician, setTechnician] = useState(filters.technician ?? "");

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/schedules",
            {
                search,
                status,
                technician,
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
        setTechnician("");

        router.get(
            "/admin/schedules",
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
                        <Sidebar active="schedules" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">
                                SECUREVIEW ADMIN
                            </div>

                            <h1 className="fw-bold mb-1">
                                SERVICE SCHEDULES
                            </h1>

                            <div className="small text-muted">
                                Monitor confirmed and in-progress service jobs.
                            </div>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        ACTIVE SCHEDULES
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.active ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        CONFIRMED
                                    </div>

                                    <div className="h4 fw-bold text-info-emphasis mb-0">
                                        {summary.confirmed ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        IN PROGRESS
                                    </div>

                                    <div className="h4 fw-bold text-primary mb-0">
                                        {summary.in_progress ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        UNASSIGNED
                                    </div>

                                    <div className="h4 fw-bold text-warning-emphasis mb-0">
                                        {summary.unassigned ?? 0}
                                    </div>
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
                                        placeholder="Inquiry, customer, or service"
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
                                        <option value="confirmed">
                                            Confirmed
                                        </option>
                                        <option value="in_progress">
                                            In Progress
                                        </option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small fw-semibold mb-1">
                                        TECHNICIAN
                                    </label>

                                    <select
                                        className="form-select"
                                        value={technician}
                                        onChange={(event) =>
                                            setTechnician(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            All technicians
                                        </option>

                                        {technicians.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
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

                                <div className="col-sm-6 col-lg-1 d-grid">
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
                                            <th>SCHEDULE</th>
                                            <th>CUSTOMER</th>
                                            <th>SERVICE</th>
                                            <th>TECHNICIAN</th>
                                            <th>STATUS</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {schedules.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No active schedules found.
                                                </td>
                                            </tr>
                                        ) : (
                                            schedules.map((schedule) => (
                                                <tr key={schedule.id}>
                                                    <td className="ps-3">
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                urgencyClass(
                                                                    schedule.urgency
                                                                )
                                                            }
                                                        >
                                                            {schedule.urgency}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.preferred_date
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {
                                                                schedule.preferred_time
                                                            }
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.customer_name
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {schedule.city}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {
                                                                schedule.service_type
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            {schedule.item_name ||
                                                                "General Service"}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {schedule.technician ? (
                                                            <>
                                                                <div className="fw-semibold">
                                                                    {
                                                                        schedule
                                                                            .technician
                                                                            .name
                                                                    }
                                                                </div>

                                                                <div className="small text-muted">
                                                                    {
                                                                        schedule
                                                                            .technician
                                                                            .email
                                                                    }
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-warning-emphasis small fw-semibold">
                                                                Unassigned
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-3 py-2 " +
                                                                statusClass(
                                                                    schedule.status
                                                                )
                                                            }
                                                        >
                                                            {statusLabel(
                                                                schedule.status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <Link
                                                            href={
                                                                "/admin/inquiries/" +
                                                                schedule.id
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

                        <div className="small text-muted mt-3">
                            Use the inquiry details page to change the
                            technician assignment or job status.
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}
