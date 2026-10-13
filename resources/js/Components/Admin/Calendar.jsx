import { useState } from "react";
import Calendar from "react-calendar";

import "react-calendar/dist/Calendar.css";

export default function AdminCalendar({
    title = "Calendar",
    schedules = [],
}) {
    const [date, setDate] = useState(new Date());

    return (
        <div className="card border rounded-3">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-3">{title}</h5>

                <Calendar onChange={setDate} value={date} />

                <div className="border-top mt-3 pt-3">
                    <h6 className="fw-bold mb-3">Next appointments</h6>
                    {schedules.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                            {schedules.map((schedule) => (
                                <div key={schedule.id} className="small">
                                    <div className="fw-semibold">{schedule.title}</div>
                                    <div className="text-muted">
                                        {schedule.date}
                                        {schedule.time ? ` · ${schedule.time}` : ""}
                                    </div>
                                    <div className="text-muted">{schedule.description}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="small text-muted mb-0">No upcoming appointments.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
