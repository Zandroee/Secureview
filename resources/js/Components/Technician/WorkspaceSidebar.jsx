import { useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import Calendar from "react-calendar";

import "react-calendar/dist/Calendar.css";

function dateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function localDateFromKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(value) {
    const date = localDateFromKey(value);
    return date
        ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
        : "Date not set";
}

function urgencyClass(urgency) {
    if (urgency === "emergency") return "bg-danger-subtle text-danger";
    if (urgency === "urgent") return "bg-warning-subtle text-warning-emphasis";
    return "bg-light text-secondary border";
}

function formatStatus(status) {
    return String(status ?? "").replaceAll("_", " ");
}

export default function WorkspaceSidebar({ jobs = [], notifications = [], notificationCount = 0 }) {
    const activeJobs = useMemo(() => {
        return (jobs ?? [])
            .filter((job) => ["confirmed", "in_progress"].includes(job.status) && job.preferred_date_value)
            .slice()
            .sort((a, b) => {
                const dateComparison = String(a.preferred_date_value).localeCompare(String(b.preferred_date_value));
                if (dateComparison !== 0) return dateComparison;
                return String(a.preferred_time ?? "").localeCompare(String(b.preferred_time ?? ""));
            });
    }, [jobs]);

    const [selectedDate, setSelectedDate] = useState(() => {
        const firstUpcoming = activeJobs.find((job) => job.preferred_date_value >= dateKey(new Date()));
        return firstUpcoming ? localDateFromKey(firstUpcoming.preferred_date_value) : new Date();
    });

    const selectedKey = dateKey(selectedDate);
    const scheduledDays = useMemo(
        () => new Set(activeJobs.map((job) => job.preferred_date_value)),
        [activeJobs]
    );

    const selectedDayJobs = activeJobs.filter((job) => job.preferred_date_value === selectedKey);
    const upcomingJobs = activeJobs.filter((job) => {
        const appointmentDate = localDateFromKey(job.preferred_date_value);
        return appointmentDate && appointmentDate >= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    }).slice(0, 4);

    const tileClassName = ({ date, view }) => {
        if (view !== "month") return null;
        return scheduledDays.has(dateKey(date)) ? "technician-calendar-day-booked" : null;
    };

    const tileContent = ({ date, view }) => {
        if (view !== "month" || !scheduledDays.has(dateKey(date))) return null;
        return <span className="d-block rounded-circle mx-auto mt-1" style={{ width: 5, height: 5, background: "#2563eb" }} />;
    };

    return (
        <div className="technician-workspace-sidebar d-flex flex-column gap-3">
            <style>{`
                .technician-workspace-sidebar .sidebar-panel {
                    border: 1px solid #dfe6ef;
                    border-radius: 16px;
                    background: #fff;
                    box-shadow: 0 4px 18px rgba(15, 23, 42, .035);
                    overflow: hidden;
                }
                .technician-workspace-sidebar .react-calendar {
                    width: 100%;
                    max-width: 100%;
                    border: 0;
                    font-family: inherit;
                    background: transparent;
                    line-height: 1.35;
                }
                .technician-workspace-sidebar .react-calendar__navigation {
                    margin-bottom: .5rem;
                    height: 40px;
                }
                .technician-workspace-sidebar .react-calendar__navigation button {
                    min-width: 28px;
                    font-weight: 600;
                    border-radius: 8px;
                }
                .technician-workspace-sidebar .react-calendar__month-view__weekdays {
                    font-size: .66rem;
                    color: #66758a;
                    text-transform: uppercase;
                    text-decoration: none;
                }
                .technician-workspace-sidebar .react-calendar__month-view__weekdays abbr {
                    text-decoration: none;
                }
                .technician-workspace-sidebar .react-calendar__tile {
                    min-height: 43px;
                    padding: .35rem .1rem;
                    border-radius: 9px;
                    font-size: .78rem;
                }
                .technician-workspace-sidebar .react-calendar__tile--now {
                    background: #eef5ff;
                    color: #1d4ed8;
                }
                .technician-workspace-sidebar .react-calendar__tile.technician-calendar-day-booked {
                    font-weight: 700;
                }
                .technician-workspace-sidebar .react-calendar__tile--active,
                .technician-workspace-sidebar .react-calendar__tile--active:enabled:hover {
                    background: #1769ed;
                    color: #fff;
                }
                .technician-workspace-sidebar .react-calendar__tile--active .rounded-circle {
                    background: #fff !important;
                }
                .technician-workspace-sidebar .sidebar-appointment {
                    border: 1px solid #e1e8f1;
                    border-radius: 12px;
                    transition: border-color .15s ease, background-color .15s ease;
                }
                .technician-workspace-sidebar .sidebar-appointment:hover {
                    border-color: #a9c9ff;
                    background: #f8fbff;
                }
                @media (prefers-reduced-motion: reduce) {
                    .technician-workspace-sidebar .sidebar-appointment { transition: none; }
                }
            `}</style>

            <section className="sidebar-panel p-3 p-lg-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                        <h2 className="h5 fw-bold mb-1">My Calendar</h2>
                        <p className="small text-secondary mb-0">Your assigned service dates.</p>
                    </div>
                    <span className="badge rounded-pill bg-primary-subtle text-primary">{activeJobs.length} scheduled</span>
                </div>

                <Calendar
                    value={selectedDate}
                    onChange={setSelectedDate}
                    tileClassName={tileClassName}
                    tileContent={tileContent}
                />

                <div className="d-flex flex-wrap align-items-center gap-2 border-top pt-2 mt-1 small text-secondary">
                    <span className="rounded-circle" style={{ width: 8, height: 8, background: "#2563eb" }} />
                    Has assigned service
                </div>

                <div className="bg-light rounded-3 p-3 mt-3">
                    <div className="small text-uppercase fw-bold text-secondary mb-1">
                        {selectedDayJobs.length ? "Selected date" : "Calendar selection"}
                    </div>
                    <div className="fw-bold">{formatDate(selectedKey)}</div>
                    {selectedDayJobs.length ? (
                        <div className="small text-secondary mt-1">
                            {selectedDayJobs.length} assigned {selectedDayJobs.length === 1 ? "service" : "services"} on this date.
                        </div>
                    ) : (
                        <div className="small text-secondary mt-1">No assigned services on this date.</div>
                    )}
                    <a href="#my-jobs" className="small text-primary fw-semibold text-decoration-none d-inline-block mt-2">
                        View my jobs <i className="bi bi-arrow-right ms-1" />
                    </a>
                </div>
            </section>

            <section className="sidebar-panel p-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                        <h2 className="h5 fw-bold mb-1">Next Appointments</h2>
                        <p className="small text-secondary mb-0">Your next assigned services.</p>
                    </div>
                    <span className="badge rounded-pill bg-primary-subtle text-primary">{upcomingJobs.length}</span>
                </div>

                {upcomingJobs.length ? (
                    <div className="d-flex flex-column gap-2">
                        {upcomingJobs.map((job) => (
                            <a key={job.id} href={"#job-" + job.id} className="sidebar-appointment d-block p-3 text-decoration-none text-reset">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <span className="fw-bold small">{job.service_type || "Service appointment"}</span>
                                    <span className={"badge rounded-pill text-capitalize flex-shrink-0 " + urgencyClass(job.urgency)}>
                                        {job.urgency || "normal"}
                                    </span>
                                </div>
                                <div className="small text-primary mt-1">{job.inquiry_number}</div>
                                <div className="small text-secondary mt-2">
                                    <i className="bi bi-calendar3 me-1" />{formatDate(job.preferred_date_value)}
                                </div>
                                <div className="small text-secondary">
                                    <i className="bi bi-clock me-1" />{job.preferred_time || "Time not set"}
                                </div>
                                <div className="small fw-semibold text-capitalize mt-2">{formatStatus(job.status)}</div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-light rounded-3 p-3">
                        <i className="bi bi-calendar-check fs-4 text-secondary d-block mb-2" />
                        <p className="small text-secondary mb-2">No upcoming appointments assigned.</p>
                        <a href="#available-jobs" className="small fw-semibold text-primary text-decoration-none">Browse available jobs</a>
                    </div>
                )}

                <a href="#my-jobs" className="btn btn-outline-primary btn-sm w-100 fw-semibold mt-3">View my service jobs</a>
            </section>

            <section className="sidebar-panel p-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                        <h2 className="h5 fw-bold mb-1">Recent Notifications</h2>
                        <p className="small text-secondary mb-0">Job and operations updates.</p>
                    </div>
                    {Number(notificationCount) > 0 && (
                        <span className="badge rounded-pill bg-danger">{notificationCount > 99 ? "99+" : notificationCount} unread</span>
                    )}
                </div>

                {notifications.length ? (
                    <div className="d-flex flex-column gap-2">
                        {notifications.map((notification) => (
                            <Link key={notification.id} href="/notifications" className={"d-block rounded-3 border p-3 text-decoration-none text-reset " + (!notification.read ? "bg-primary-subtle" : "bg-white")}>
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div className="fw-semibold small">{notification.title}</div>
                                    {!notification.read && <span className="rounded-circle bg-primary flex-shrink-0 mt-1" style={{ width: 7, height: 7 }} />}
                                </div>
                                <div className="small text-secondary mt-1" style={{ overflowWrap: "anywhere" }}>{notification.message}</div>
                                <div className="small text-secondary mt-2">{notification.created_at}</div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-light rounded-3 p-3">
                        <i className="bi bi-bell fs-4 text-secondary d-block mb-2" />
                        <p className="small text-secondary mb-0">No recent notifications.</p>
                    </div>
                )}

                <Link href="/notifications" className="btn btn-outline-primary btn-sm w-100 fw-semibold mt-3">
                    <i className="bi bi-bell me-2" />Open notifications
                </Link>
            </section>
        </div>
    );
}
