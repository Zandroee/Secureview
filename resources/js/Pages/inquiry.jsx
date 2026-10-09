import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

const serviceTypes = [
    "Installation",
    "Site Inspection",
    "Maintenance",
    "Repair",
    "Consultation",
    "Other",
];

const timeSlots = [
    { label: "08:00 AM - 09:00 AM", available: true },
    { label: "09:00 AM - 10:00 AM", available: true },
    { label: "10:00 AM - 11:00 AM", available: true },
    { label: "11:00 AM - 12:00 PM", available: false },
    { label: "01:00 PM - 02:00 PM", available: true },
    { label: "02:00 PM - 03:00 PM", available: true },
    { label: "03:00 PM - 04:00 PM", available: false },
    { label: "04:00 PM - 05:00 PM", available: true },
];

const sectionTitleStyle = {
    fontFamily: "Outfit, sans-serif",
    fontSize: "0.95rem",
    fontWeight: 800,
    marginBottom: "0.85rem",
};

const fieldStyle = {
    backgroundColor: "#f1f1f3",
    border: "1px solid #e2e3e6",
    borderRadius: "9px",
    minHeight: "40px",
    fontSize: "0.85rem",
};

const formatDateLabel = (value) => {
    if (!value) {
        return "";
    }

    return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function Inquiry({ customer, item }) {
    const today = new Date();
    const [showDateModal, setShowDateModal] = useState(false);

    const [calendarMonth, setCalendarMonth] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");

    const { data, setData, post, processing, errors } = useForm({
        item_type: item?.type ?? "",
        item_id: item?.id ?? "",
        customer_name: customer?.name ?? "",
        customer_phone: customer?.phone ?? "",
        customer_email: customer?.email ?? "",
        street_address: "",
        city: "",
        service_type: "Installation",
        urgency: "normal",
        preferred_date: "",
        preferred_time: "",
        notes: "",
    });

    const monthLabel = calendarMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const calendarDays = useMemo(() => {
        const firstDay = new Date(
            calendarMonth.getFullYear(),
            calendarMonth.getMonth(),
            1
        ).getDay();

        const daysInMonth = new Date(
            calendarMonth.getFullYear(),
            calendarMonth.getMonth() + 1,
            0
        ).getDate();

        const days = [];

        for (let index = 0; index < firstDay; index += 1) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            days.push(
                new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth(),
                    day
                )
            );
        }

        return days;
    }, [calendarMonth]);

    const isPastDate = (date) => {
        if (!date) {
            return false;
        }

        const startOfToday = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        return date < startOfToday;
    };

    const openDateModal = () => {
        if (data.preferred_date) {
            const existing = new Date(
                data.preferred_date + "T00:00:00"
            );

            setCalendarMonth(
                new Date(existing.getFullYear(), existing.getMonth(), 1)
            );
            setSelectedDate(data.preferred_date);
            setSelectedTime(data.preferred_time);
        } else {
            setCalendarMonth(
                new Date(today.getFullYear(), today.getMonth(), 1)
            );
            setSelectedDate("");
            setSelectedTime("");
        }

        setShowDateModal(true);
    };

    const selectDate = (date) => {
        if (!date || isPastDate(date)) {
            return;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        setSelectedDate(year + "-" + month + "-" + day);
        setSelectedTime("");
    };

    const confirmDateTime = () => {
        if (!selectedDate || !selectedTime) {
            return;
        }

        setData("preferred_date", selectedDate);
        setData("preferred_time", selectedTime);
        setShowDateModal(false);
    };

    const submit = (event) => {
        event.preventDefault();

        post("/inquiries", {
            preserveScroll: true,
        });
    };

    return (
        <div>
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f2f2f4",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-3 py-md-4">
                    <div className="row g-3 align-items-start">
                        <div className="col-lg-7">
                            <div
                                className="bg-white border rounded-3 p-3"
                                style={{
                                    boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <div className="small text-uppercase fw-bold text-primary">
                                            SecureView
                                        </div>

                                        <h1
                                            className="fw-bold mb-0"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "1.65rem",
                                            }}
                                        >
                                            BOOKING
                                        </h1>
                                    </div>

                                    <div
                                        className="fw-bold"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        Inquiry
                                    </div>
                                </div>

                                {errors.inquiry && (
                                    <div className="alert alert-danger small">
                                        {errors.inquiry}
                                    </div>
                                )}

                                <form onSubmit={submit}>
                                    <div className="mb-3">
                                        <div style={sectionTitleStyle}>
                                            CUSTOMER'S PERSONAL INFORMATION
                                        </div>

                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Full Name *
                                                </label>

                                                <input
                                                    type="text"
                                                    className={
                                                        "form-control " +
                                                        (errors.customer_name
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.customer_name}
                                                    onChange={(event) =>
                                                        setData(
                                                            "customer_name",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.customer_name && (
                                                    <div className="invalid-feedback">
                                                        {errors.customer_name}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Phone No. *
                                                </label>

                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength="11"
                                                    className={
                                                        "form-control " +
                                                        (errors.customer_phone
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.customer_phone}
                                                    onChange={(event) =>
                                                        setData(
                                                            "customer_phone",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.customer_phone && (
                                                    <div className="invalid-feedback">
                                                        {errors.customer_phone}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Email Address *
                                                </label>

                                                <input
                                                    type="email"
                                                    className={
                                                        "form-control " +
                                                        (errors.customer_email
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.customer_email}
                                                    onChange={(event) =>
                                                        setData(
                                                            "customer_email",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.customer_email && (
                                                    <div className="invalid-feedback">
                                                        {errors.customer_email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div style={sectionTitleStyle}>
                                            CUSTOMER'S ADDRESS
                                        </div>

                                        <div className="row g-2">
                                            <div className="col-12">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Street Address *
                                                </label>

                                                <input
                                                    type="text"
                                                    className={
                                                        "form-control " +
                                                        (errors.street_address
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    placeholder="House/Unit, Street, Barangay"
                                                    value={data.street_address}
                                                    onChange={(event) =>
                                                        setData(
                                                            "street_address",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.street_address && (
                                                    <div className="invalid-feedback">
                                                        {errors.street_address}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label small fw-semibold mb-1">
                                                    City *
                                                </label>

                                                <input
                                                    type="text"
                                                    className={
                                                        "form-control " +
                                                        (errors.city
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    placeholder="City / Municipality"
                                                    value={data.city}
                                                    onChange={(event) =>
                                                        setData(
                                                            "city",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.city && (
                                                    <div className="invalid-feedback">
                                                        {errors.city}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div style={sectionTitleStyle}>
                                            SERVICE DETAILS
                                        </div>

                                        <div className="row g-2">
                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Service Type *
                                                </label>

                                                <select
                                                    className={
                                                        "form-select " +
                                                        (errors.service_type
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.service_type}
                                                    onChange={(event) =>
                                                        setData(
                                                            "service_type",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    {serviceTypes.map(
                                                        (service) => (
                                                            <option
                                                                key={service}
                                                                value={service}
                                                            >
                                                                {service}
                                                            </option>
                                                        )
                                                    )}
                                                </select>

                                                {errors.service_type && (
                                                    <div className="invalid-feedback">
                                                        {errors.service_type}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Urgency *
                                                </label>

                                                <select
                                                    className={
                                                        "form-select " +
                                                        (errors.urgency
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.urgency}
                                                    onChange={(event) =>
                                                        setData(
                                                            "urgency",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="normal">
                                                        Normal
                                                    </option>

                                                    <option value="urgent">
                                                        Urgent
                                                    </option>

                                                    <option value="emergency">
                                                        Emergency
                                                    </option>
                                                </select>

                                                {errors.urgency && (
                                                    <div className="invalid-feedback">
                                                        {errors.urgency}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Preferred Date &amp; Time *
                                                </label>

                                                <button
                                                    type="button"
                                                    className={
                                                        "form-control text-start " +
                                                        (errors.preferred_date ||
                                                        errors.preferred_time
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={{
                                                        ...fieldStyle,
                                                        color:
                                                            data.preferred_date &&
                                                            data.preferred_time
                                                                ? "#212529"
                                                                : "#9a9aa0",
                                                    }}
                                                    onClick={openDateModal}
                                                >
                                                    {data.preferred_date &&
                                                    data.preferred_time
                                                        ? formatDateLabel(
                                                              data.preferred_date
                                                          ) +
                                                          " · " +
                                                          data.preferred_time
                                                        : "Select date and time"}
                                                </button>

                                                {errors.preferred_date && (
                                                    <div className="text-danger small mt-1">
                                                        {errors.preferred_date}
                                                    </div>
                                                )}

                                                {errors.preferred_time && (
                                                    <div className="text-danger small mt-1">
                                                        {errors.preferred_time}
                                                    </div>
                                                )}
                                            </div>

                                            {item && (
                                                <div className="col-12">
                                                    <label className="form-label small fw-semibold mb-1">
                                                        Selected Item
                                                    </label>

                                                    <div
                                                        className="d-flex align-items-center gap-2 border rounded-3 p-2"
                                                        style={{
                                                            backgroundColor:
                                                                "#fafafa",
                                                        }}
                                                    >
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="rounded-2"
                                                                style={{
                                                                    width: "54px",
                                                                    height: "54px",
                                                                    objectFit:
                                                                        "cover",
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                                style={{
                                                                    width: "54px",
                                                                    height: "54px",
                                                                }}
                                                            >
                                                                <i className="bi bi-camera-video text-secondary"></i>
                                                            </div>
                                                        )}

                                                        <div className="flex-grow-1">
                                                            <div className="small text-primary text-uppercase fw-bold">
                                                                {item.type}
                                                            </div>
                                                            <div className="fw-bold">
                                                                {item.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-12">
                                                <label className="form-label small fw-semibold mb-1">
                                                    Additional Notes{" "}
                                                    <span className="text-muted fw-normal">
                                                        (Optional)
                                                    </span>
                                                </label>

                                                <textarea
                                                    rows="3"
                                                    className={
                                                        "form-control " +
                                                        (errors.notes
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={{
                                                        ...fieldStyle,
                                                        resize: "vertical",
                                                    }}
                                                    placeholder="Additional notes"
                                                    value={data.notes}
                                                    onChange={(event) =>
                                                        setData(
                                                            "notes",
                                                            event.target.value
                                                        )
                                                    }
                                                ></textarea>

                                                {errors.notes && (
                                                    <div className="invalid-feedback">
                                                        {errors.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold w-100 py-2"
                                        disabled={processing}
                                    >
                                        {processing
                                            ? "SUBMITTING..."
                                            : "CONFIRM INQUIRY"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div
                                className="bg-white border rounded-3 p-3"
                                style={{
                                    boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4
                                        className="fw-bold mb-0"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                            fontSize: "1.15rem",
                                        }}
                                    >
                                        CART
                                    </h4>

                                    <span className="small text-muted">
                                        {item ? "1 item" : "No selected item"}
                                    </span>
                                </div>

                                {item ? (
                                    <div
                                        className="border rounded-3 p-2 mb-3"
                                        style={{
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <div className="d-flex gap-2 align-items-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="rounded-2"
                                                    style={{
                                                        width: "62px",
                                                        height: "62px",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: "62px",
                                                        height: "62px",
                                                    }}
                                                >
                                                    <i className="bi bi-camera-video text-secondary"></i>
                                                </div>
                                            )}

                                            <div className="flex-grow-1">
                                                <div className="small text-primary text-uppercase fw-bold">
                                                    {item.type}
                                                </div>

                                                <div className="fw-bold">
                                                    {item.name}
                                                </div>

                                                <div className="small text-muted">
                                                    Inquiry Item
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm fw-bold"
                                                onClick={() =>
                                                    (window.location.href =
                                                        item.type === "package"
                                                            ? "/packages/" +
                                                              item.id
                                                            : "/products/" +
                                                              item.id)
                                                }
                                            >
                                                DETAILS
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="rounded-3 p-3 mb-3"
                                        style={{
                                            backgroundColor: "#f6f6f7",
                                        }}
                                    >
                                        <div className="fw-bold small">
                                            General Service Inquiry
                                        </div>

                                        <div className="small text-muted mt-1">
                                            No specific product or package was
                                            selected.
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex justify-content-between small fw-semibold mb-3">
                                    <span>You have:</span>
                                    <span>{item ? "1 Inquiry Item" : "1 Inquiry"}</span>
                                </div>

                                <div
                                    className="rounded-3 p-3"
                                    style={{
                                        backgroundColor: "#eef7ff",
                                    }}
                                >
                                    <div
                                        className="fw-bold text-center mb-2"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        Why Choose Us?
                                    </div>

                                    <div className="small text-muted mb-2">
                                        ✓ Certified Technicians
                                    </div>

                                    <div className="small text-muted mb-2">
                                        ✓ Free Installation Consultation
                                    </div>

                                    <div className="small text-muted">
                                        ✓ Quick Service
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {showDateModal && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.45)",
                        zIndex: 2000,
                        padding: "1rem",
                    }}
                    onClick={() => setShowDateModal(false)}
                >
                    <div
                        className="bg-white rounded-4 border p-3"
                        style={{
                            width: "100%",
                            maxWidth: "620px",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div className="small text-uppercase fw-bold text-primary">
                                    Select Date & Time
                                </div>

                                <div
                                    className="fw-bold"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    Select Preferred Date and Time
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-link btn-sm text-primary text-decoration-none"
                                onClick={() => setShowDateModal(false)}
                            >
                                Back
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-7">
                                <div className="border rounded-3 p-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light border"
                                            onClick={() =>
                                                setCalendarMonth(
                                                    new Date(
                                                        calendarMonth.getFullYear(),
                                                        calendarMonth.getMonth() -
                                                            1,
                                                        1
                                                    )
                                                )
                                            }
                                            disabled={
                                                calendarMonth.getFullYear() ===
                                                    today.getFullYear() &&
                                                calendarMonth.getMonth() ===
                                                    today.getMonth()
                                            }
                                        >
                                            ‹
                                        </button>

                                        <div className="fw-bold small">
                                            {monthLabel}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light border"
                                            onClick={() =>
                                                setCalendarMonth(
                                                    new Date(
                                                        calendarMonth.getFullYear(),
                                                        calendarMonth.getMonth() +
                                                            1,
                                                        1
                                                    )
                                                )
                                            }
                                        >
                                            ›
                                        </button>
                                    </div>

                                    <div
                                        className="d-grid"
                                        style={{
                                            gridTemplateColumns:
                                                "repeat(7, 1fr)",
                                            gap: "4px",
                                        }}
                                    >
                                        {["S", "M", "T", "W", "T", "F", "S"].map(
                                            (day, index) => (
                                                <div
                                                    key={day + index}
                                                    className="text-center text-muted fw-bold"
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        padding: "3px",
                                                    }}
                                                >
                                                    {day}
                                                </div>
                                            )
                                        )}

                                        {calendarDays.map((date, index) => {
                                            const value = date
                                                ? date
                                                      .toISOString()
                                                      .split("T")[0]
                                                : "";

                                            const selected =
                                                selectedDate === value;
                                            const past = isPastDate(date);

                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        value || "empty-" + index
                                                    }
                                                    disabled={!date || past}
                                                    onClick={() =>
                                                        selectDate(date)
                                                    }
                                                    className="btn btn-sm"
                                                    style={{
                                                        minHeight: "32px",
                                                        padding: 0,
                                                        borderRadius: "8px",
                                                        border: selected
                                                            ? "1px solid #0d6efd"
                                                            : "1px solid transparent",
                                                        backgroundColor: selected
                                                            ? "#0d6efd"
                                                            : past
                                                              ? "#f1f1f3"
                                                              : "#fff",
                                                        color: selected
                                                            ? "#fff"
                                                            : past
                                                              ? "#b7b8bd"
                                                              : "#212529",
                                                        fontSize: "0.78rem",
                                                        position: "relative",
                                                    }}
                                                >
                                                    {date?.getDate() ?? ""}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="d-flex justify-content-center gap-3 mt-3 small">
                                        <span className="text-success">
                                            ● Available
                                        </span>

                                        <span className="text-danger">
                                            ● Fully Booked
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-5">
                                <div className="border rounded-3 p-2 h-100">
                                    <div className="small fw-bold mb-2">
                                        TIME
                                    </div>

                                    <div className="d-flex flex-column gap-2">
                                        {timeSlots.map((slot) => {
                                            const selected =
                                                selectedTime === slot.label;

                                            return (
                                                <button
                                                    key={slot.label}
                                                    type="button"
                                                    disabled={
                                                        !selectedDate ||
                                                        !slot.available
                                                    }
                                                    onClick={() =>
                                                        setSelectedTime(
                                                            slot.label
                                                        )
                                                    }
                                                    className="btn btn-sm text-start d-flex justify-content-between align-items-center"
                                                    style={{
                                                        border: selected
                                                            ? "1px solid #0d6efd"
                                                            : "1px solid #e2e3e6",
                                                        backgroundColor: selected
                                                            ? "#edf5ff"
                                                            : slot.available
                                                              ? "#fff"
                                                              : "#f6f6f7",
                                                        color: slot.available
                                                            ? "#212529"
                                                            : "#b0b0b4",
                                                        borderRadius: "8px",
                                                        fontSize: "0.72rem",
                                                    }}
                                                >
                                                    <span>{slot.label}</span>

                                                    <span
                                                        className={
                                                            slot.available
                                                                ? "text-success"
                                                                : "text-danger"
                                                        }
                                                    >
                                                        {slot.available
                                                            ? "Available"
                                                            : "Full"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="small text-muted">
                                {selectedDate
                                    ? formatDateLabel(selectedDate)
                                    : "Choose a date"}{" "}
                                {selectedTime ? "· " + selectedTime : ""}
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary fw-bold px-4"
                                onClick={confirmDateTime}
                                disabled={!selectedDate || !selectedTime}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
