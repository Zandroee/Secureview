import { useState } from "react";
import PanelPagination from "./PanelPagination";
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

function statusClass(status) {
    return status === "in_progress"
        ? "bg-primary-subtle text-primary"
        : "bg-info-subtle text-info-emphasis";
}

function urgencyClass(urgency) {
    if (urgency === "emergency") return "bg-danger-subtle text-danger";
    if (urgency === "urgent") return "bg-warning-subtle text-warning-emphasis";
    return "bg-light text-secondary border";
}

export default function AdminCalendar({
    title = "Calendar",
    schedules = [],
    upcomingCount = 0,
    fullyBookedDates = [],
    partiallyBlockedDates = [],
    subtitle = "Appointment dates and booking availability.",
    viewAllHref = "/admin/schedules",
    itemHrefPrefix = "/admin/schedules/",
}) {
    const [date, setDate] = useState(new Date());
    const [schedulePage, setSchedulePage] = useState(1);
    const fullyBookedSet = new Set(fullyBookedDates ?? []);
    const partiallyBlockedSet = new Set(partiallyBlockedDates ?? []);
    const allSchedules = schedules ?? [];
    const schedulePageSize = 3;
    const scheduleTotalPages = Math.ceil(allSchedules.length / schedulePageSize);
    const safeSchedulePage = Math.min(schedulePage, Math.max(1, scheduleTotalPages));
    const displayedSchedules = allSchedules.slice(
        (safeSchedulePage - 1) * schedulePageSize,
        safeSchedulePage * schedulePageSize
    );

    const markDateClass = ({ date: tileDate, view }) => {
        if (view !== "month") return null;

        const key = dateKey(tileDate);
        if (fullyBookedSet.has(key)) return "admin-calendar-day-fully-booked";
        if (partiallyBlockedSet.has(key)) return "admin-calendar-day-partially-blocked";

        return null;
    };

    const markDateContent = ({ date: tileDate, view }) => {
        if (view !== "month") return null;

        const key = dateKey(tileDate);
        if (fullyBookedSet.has(key)) {
            return (
                <span
                    className="d-block mx-auto mt-1 rounded-circle"
                    style={{ width: "5px", height: "5px", backgroundColor: "#b91c1c" }}
                    title="Fully booked or blocked"
                    aria-label="Fully booked or blocked"
                />
            );
        }

        if (partiallyBlockedSet.has(key)) {
            return (
                <span
                    className="d-block mx-auto mt-1 rounded-circle"
                    style={{ width: "5px", height: "5px", backgroundColor: "#b7791f" }}
                    title="Some time slots are blocked or technician capacity is in use"
                    aria-label="Some time slots are blocked or technician capacity is in use"
                />
            );
        }

        return null;
    };

    return (
        <div className="card border rounded-3 admin-dashboard-calendar">
            <style>{`
                .admin-dashboard-calendar {
                    width: 100%;
                    min-width: 0;
                }
                .admin-dashboard-calendar .card-body {
                    min-width: 0;
                }
                .admin-dashboard-calendar .react-calendar {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                    border: 0;
                    background: transparent;
                    font-family: inherit;
                    line-height: 1.35;
                }
                .admin-dashboard-calendar .react-calendar__navigation {
                    display: flex;
                    align-items: stretch;
                    gap: 2px;
                    height: auto;
                    min-height: 2.5rem;
                    margin-bottom: .5rem;
                }
                .admin-dashboard-calendar .react-calendar__navigation button {
                    min-width: 0;
                    flex: 1 1 0;
                    padding: .35rem .1rem;
                    border-radius: 6px;
                    white-space: nowrap;
                    font-size: .875rem;
                }
                .admin-dashboard-calendar .react-calendar__navigation__label {
                    flex: 3 1 0;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .admin-dashboard-calendar .react-calendar__month-view__weekdays {
                    font-size: clamp(.56rem, .7vw, .7rem);
                }
                .admin-dashboard-calendar .react-calendar__month-view__weekdays__weekday {
                    padding: .4em .05em;
                }
                .admin-dashboard-calendar .react-calendar__tile {
                    min-width: 0;
                    max-width: 100%;
                    min-height: clamp(2.3rem, 3vw, 3rem);
                    padding: .45em .05em;
                    border-radius: 6px;
                    font-size: clamp(.68rem, .8vw, .82rem);
                }
                @media (max-width: 575.98px) {
                    .admin-dashboard-calendar .react-calendar__navigation button {
                        font-size: .78rem;
                    }
                    .admin-dashboard-calendar .react-calendar__tile {
                        min-height: 2.15rem;
                        padding: .35em 0;
                        font-size: .73rem;
                    }
                }
                .admin-dashboard-calendar .react-calendar__tile.admin-calendar-day-fully-booked {
                    background: #fee2e2;
                    color: #991b1b;
                    border-radius: 8px;
                    font-weight: 700;
                }
                .admin-dashboard-calendar .react-calendar__tile.admin-calendar-day-fully-booked:enabled:hover {
                    background: #fecaca;
                }
                .admin-dashboard-calendar .react-calendar__tile--active.admin-calendar-day-fully-booked {
                    background: #fee2e2;
                    color: #991b1b;
                    outline: 2px solid #2563eb;
                    outline-offset: -2px;
                }
                .admin-dashboard-calendar .react-calendar__tile.admin-calendar-day-partially-blocked {
                    background: #fef3c7;
                    color: #92400e;
                    border-radius: 8px;
                    font-weight: 600;
                }
                .admin-dashboard-calendar .react-calendar__tile--active.admin-calendar-day-partially-blocked {
                    background: #fef3c7;
                    color: #92400e;
                    outline: 2px solid #2563eb;
                    outline-offset: -2px;
                }
            `}</style>

            <div className="card-body p-3 p-lg-4">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">{title}</h5>
                        <p className="small text-muted mb-0">
                            {subtitle}
                        </p>
                    </div>
                    <Link
                        href="/admin/schedules"
                        className="btn btn-sm btn-outline-primary text-nowrap"
                        title="View all schedules"
                    >
                        View all
                    </Link>
                </div>

                <Calendar
                    onChange={setDate}
                    value={date}
                    tileClassName={markDateClass}
                    tileContent={markDateContent}
                />

                <div className="d-flex flex-wrap gap-2 small mt-2 mb-3" aria-label="Calendar legend">
                    <span className="d-inline-flex align-items-center gap-1">
                        <span className="rounded-circle" style={{ width: 8, height: 8, background: "#b91c1c" }} />
                        Fully booked / blocked
                    </span>
                    <span className="d-inline-flex align-items-center gap-1">
                        <span className="rounded-circle" style={{ width: 8, height: 8, background: "#b7791f" }} />
                        Partial capacity
                    </span>
                </div>

                <div className="border-top pt-3">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                        <h6 className="fw-bold mb-0">Next appointments</h6>
                        <span className="badge bg-primary-subtle text-primary rounded-pill">
                            {upcomingCount} upcoming
                        </span>
                    </div>

                    {displayedSchedules.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                            {displayedSchedules.map((schedule) => (
                                <Link
                                    key={schedule.id}
                                    href={itemHrefPrefix.endsWith("#my-jobs") ? itemHrefPrefix : itemHrefPrefix + schedule.id}
                                    className="d-block text-decoration-none text-reset border rounded-3 p-2"
                                >
                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                        <div className="fw-semibold small">{schedule.title}</div>
                                        <span className={"badge rounded-pill text-capitalize flex-shrink-0 " + urgencyClass(schedule.urgency)}>
                                            {schedule.urgency || "normal"}
                                        </span>
                                    </div>
                                    <div className="small text-muted mt-1">
                                        <i className="bi bi-calendar3 me-1" />
                                        {schedule.date}
                                    </div>
                                    {schedule.time && (
                                        <div className="small text-muted">
                                            <i className="bi bi-clock me-1" />
                                            {schedule.time}
                                        </div>
                                    )}
                                    <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                                        <span className="small text-muted text-truncate">
                                            {schedule.customer_name || schedule.description}
                                        </span>
                                        <span className={"badge rounded-pill text-capitalize " + statusClass(schedule.status)}>
                                            {String(schedule.status || "confirmed").replace(/_/g, " ")}
                                        </span>
                                    </div>
                                    <div className="small text-primary mt-1">{schedule.inquiry_number ? `Service # ${schedule.inquiry_number}` : "Service"}</div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center border rounded-3 bg-light p-3">
                            <i className="bi bi-calendar-check fs-4 text-muted d-block mb-1" />
                            <p className="small text-muted mb-2">No upcoming appointments.</p>
                            <Link href={viewAllHref} className="small fw-semibold text-decoration-none">
                                Open schedules
                            </Link>
                        </div>
                    )}
                    <PanelPagination
                        page={safeSchedulePage}
                        totalPages={scheduleTotalPages}
                        totalItems={allSchedules.length}
                        pageSize={schedulePageSize}
                        onPageChange={setSchedulePage}
                    />
                </div>
            </div>
        </div>
    );
}
