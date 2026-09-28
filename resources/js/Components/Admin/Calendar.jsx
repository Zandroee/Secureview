import { useState } from "react";
import Calendar from "react-calendar";

import "react-calendar/dist/Calendar.css";


export default function AdminCalendar({}){
    const [date, setDate] = useState(new Date());

    return(
        <div className="card border rounded-3">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-3">
                    Calendar
                </h5>

                <Calendar
                    onChange={setDate}
                    value={date}
                />
            </div>
        </div>
    );
}