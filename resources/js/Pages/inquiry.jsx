import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import ServiceLocationPicker from "../Components/GoogleMaps/ServiceLocation";
import { router, useForm } from "@inertiajs/react";
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
    { label: "08:00 AM - 11:00 AM", available: true },
    { label: "11:00 AM - 02:00 PM", available: true },
    { label: "02:00 PM - 05:00 PM", available: true },
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

const localDateString = (date) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
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

export default function Inquiry({ customer, item, catalogItems = [], cartItems = [], initialServiceType = "Installation", unavailableDates = [], unavailableTimeSlots = {} }) {
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
        item_quantity: cartItems.find((cartItem) =>
            cartItem.type === item?.type && String(cartItem.id) === String(item?.id)
        )?.quantity ?? 1,
        customer_name: customer?.name ?? "",
        customer_phone: customer?.phone ?? "",
        customer_email: customer?.email ?? "",
        street_address: "",
        address_details: "",
        city: "",
        service_latitude: "",
        service_longitude: "",
        google_place_id: "",
        service_type: initialServiceType,
        payment_method: "gcash",
        urgency: "normal",
        preferred_date: "",
        preferred_time: "",
        notes: "",
    });

    const selectedCatalogItem =
        catalogItems.find((candidate) =>
            candidate.type === data.item_type && String(candidate.id) === String(data.item_id)
        ) || (
            item && item.type === data.item_type && String(item.id) === String(data.item_id)
                ? item
                : null
        );
    const installationFee = Number(selectedCatalogItem?.installation_fee ?? 0);
    const selectedItemQuantity = Math.max(1, Number(data.item_quantity ?? 1));
    const selectedItemTotal = (Number(selectedCatalogItem?.price ?? 0) + installationFee) * selectedItemQuantity;

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

    const isFullyBookedDate = (dateValue) =>
        Boolean(dateValue) && unavailableDates.includes(dateValue);

    const isTimeSlotFullyBooked = (timeSlot) =>
        Boolean(selectedDate) &&
        (unavailableTimeSlots[selectedDate] ?? []).includes(timeSlot);

    const openDateModal = () => {
        if (data.preferred_date) {
            const existing = new Date(
                data.preferred_date + "T00:00:00"
            );

            setCalendarMonth(
                new Date(existing.getFullYear(), existing.getMonth(), 1)
            );
            if (
                isFullyBookedDate(data.preferred_date) ||
                (unavailableTimeSlots[data.preferred_date] ?? []).includes(data.preferred_time)
            ) {
                setSelectedDate(isFullyBookedDate(data.preferred_date) ? "" : data.preferred_date);
                setSelectedTime("");
            } else {
                setSelectedDate(data.preferred_date);
                setSelectedTime(data.preferred_time);
            }
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

        const value = localDateString(date);

        if (isFullyBookedDate(value)) {
            return;
        }

        setSelectedDate(value);
        setSelectedTime("");
    };

    const confirmDateTime = () => {
        if (
            !selectedDate ||
            !selectedTime ||
            isFullyBookedDate(selectedDate) ||
            isTimeSlotFullyBooked(selectedTime)
        ) {
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

                                {errors.inquiry && <div className="alert alert-danger small">{errors.inquiry}</div>}
                                {errors.payment && <div className="alert alert-danger small">{errors.payment}</div>}

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

                                            {data.service_type === "Installation" && (
                                                <div className="col-12">
                                                    <label className="form-label small fw-semibold mb-1">Payment Method *</label>
                                                    <select
                                                        className={"form-select " + (errors.payment_method ? "is-invalid" : "")}
                                                        style={fieldStyle}
                                                        value={data.payment_method}
                                                        onChange={(event) => setData("payment_method", event.target.value)}
                                                    >
                                                        <option value="gcash">GCash</option>
                                                        <option value="card">Credit / Debit Card</option>
                                                        <option value="maya">Maya</option>
                                                    </select>
                                                    {errors.payment_method && <div className="invalid-feedback">{errors.payment_method}</div>}
                                                    <div className="form-text">
                                                        You will be redirected to PayMongo. SecureView creates the installation inquiry only after payment is confirmed.
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
                                        disabled={processing || (data.service_type === "Installation" && !selectedCatalogItem)}
                                    >
                                        {processing
                                            ? "PROCESSING..."
                                            : data.service_type === "Installation"
                                                ? "CONTINUE TO PAYMENT"
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
                                    <div>
                                        <h4 className="fw-bold mb-1" style={{ fontFamily: "Outfit, sans-serif", fontSize: "1.15rem" }}>CART</h4>
                                        <div className="small text-muted">Choose the cart item for this service.</div>
                                    </div>
                                    <span className="small text-muted">{cartItems.length} {cartItems.length === 1 ? "item" : "items"}</span>
                                </div>

                                {selectedCatalogItem ? (
                                    <div className="border rounded-3 p-3 mb-3" style={{ backgroundColor: "#eef7ff", borderColor: "#cfe2ff" }}>
                                        <div className="d-flex align-items-start gap-3">
                                            {selectedCatalogItem.image ? (
                                                <img src={selectedCatalogItem.image} alt={selectedCatalogItem.name} className="rounded-2" style={{ width: 64, height: 64, objectFit: "cover" }} />
                                            ) : (
                                                <div className="rounded-2 bg-white text-primary d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                                                    <i className="bi bi-camera-video fs-4" />
                                                </div>
                                            )}
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="small text-primary text-uppercase fw-bold">Selected for {data.service_type}</div>
                                                <div className="fw-bold">{selectedCatalogItem.name}</div>
                                                <div className="small text-muted">Quantity: {selectedItemQuantity}</div>
                                                <div className="small text-muted">
                                                    Item: ₱{(Number(selectedCatalogItem.price) * selectedItemQuantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                {data.service_type === "Installation" && (
                                                    <>
                                                        <div className="small text-muted">
                                                            Installation: {installationFee > 0
                                                                ? "₱" + (installationFee * selectedItemQuantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                : "Free"}
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center border-top mt-2 pt-2">
                                                            <span className="small fw-bold">Total due</span>
                                                            <span className="fw-bold text-primary">₱{selectedItemTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                            <a href={selectedCatalogItem.type === "package" ? "/packages/" + selectedCatalogItem.id : "/products/" + selectedCatalogItem.id} className="small text-decoration-none">View details</a>
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setData((current) => ({ ...current, item_type: "", item_id: "", item_quantity: 1 }))}>
                                                <i className="bi bi-x-circle me-1" />Cancel item
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: "#f6f6f7" }}>
                                        <div className="fw-bold small">{data.service_type === "Installation" ? "Choose an item from your cart" : "No item selected"}</div>
                                        <div className="small text-muted mt-1">
                                            {data.service_type === "Installation"
                                                ? "An installation requires a product or package. Select one of the cart items below."
                                                : "Selecting a cart item is optional for this service."}
                                        </div>
                                    </div>
                                )}

                                {errors.item_id && <div className="small text-danger mb-2">{errors.item_id}</div>}

                                {cartItems.length > 0 ? (
                                    <div className="d-flex flex-column gap-2 mb-3">
                                        <div className="small text-muted fw-semibold text-uppercase">Items in your cart</div>
                                        {cartItems.map((cartItem) => {
                                            const isSelected = cartItem.type === data.item_type && String(cartItem.id) === String(data.item_id);
                                            const unavailable = Number(cartItem.available_stock ?? 0) < Number(cartItem.quantity ?? 1);
                                            return (
                                                <div key={cartItem.cart_item_id} className="border rounded-3 p-2">
                                                    <div className="d-flex align-items-start gap-2">
                                                        {cartItem.image ? (
                                                            <img src={cartItem.image} alt={cartItem.name} className="rounded-2 flex-shrink-0" style={{ width: 58, height: 58, objectFit: "cover" }} />
                                                        ) : (
                                                            <div className="rounded-2 bg-light text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 58, height: 58 }}>
                                                                <i className="bi bi-camera-video fs-5" />
                                                            </div>
                                                        )}
                                                        <div className="flex-grow-1 min-w-0">
                                                            <div className="small text-primary text-uppercase fw-bold">{cartItem.type}{cartItem.category ? " · " + cartItem.category : ""}</div>
                                                            <div className="small fw-bold">{cartItem.name}</div>
                                                            <div className="small text-muted">Qty {cartItem.quantity} · ₱{(Number(cartItem.price) * Number(cartItem.quantity)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            {data.service_type === "Installation" && (
                                                                <div className="small text-muted">Installation: {Number(cartItem.installation_fee ?? 0) > 0 ? "₱" + (Number(cartItem.installation_fee) * Number(cartItem.quantity)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Free"}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center gap-2 mt-2 pt-2 border-top">
                                                        <button
                                                            type="button"
                                                            className={isSelected ? "btn btn-sm btn-primary" : "btn btn-sm btn-outline-primary"}
                                                            disabled={isSelected || unavailable}
                                                            onClick={() => setData((current) => ({
                                                                ...current,
                                                                item_type: cartItem.type,
                                                                item_id: Number(cartItem.id),
                                                                item_quantity: Number(cartItem.quantity ?? 1),
                                                            }))}
                                                        >
                                                            <i className={"bi " + (isSelected ? "bi-check-circle me-1" : "bi-box-arrow-in-down-right me-1")} />
                                                            {isSelected ? "Selected" : data.service_type === "Installation" ? "Use for installation" : "Attach to inquiry"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link text-danger text-decoration-none px-1"
                                                            onClick={() => router.delete("/cart/items/" + cartItem.cart_item_id, {
                                                                preserveScroll: true,
                                                                onSuccess: () => {
                                                                    if (isSelected) {
                                                                        setData((current) => ({ ...current, item_type: "", item_id: "", item_quantity: 1 }));
                                                                    }
                                                                },
                                                            })}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    {unavailable && <div className="small text-danger mt-1">Quantity exceeds available stock.</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="border rounded-3 p-3 mb-3 text-center">
                                        <i className="bi bi-cart3 text-muted fs-3" />
                                        <div className="small fw-semibold mt-2">{selectedCatalogItem ? "No additional items in your cart" : "Your cart is empty"}</div>
                                        <div className="small text-muted mt-1 mb-2">
                                            {selectedCatalogItem
                                                ? "Your selected catalog item is still attached to this inquiry. Add other products or packages from their details pages if needed."
                                                : "Add a product or package from its details page, then return here to select it."}
                                        </div>
                                        <div className="d-flex justify-content-center gap-2">
                                            <a href="/products" className="btn btn-sm btn-outline-primary">Browse products</a>
                                            <a href="/packages" className="btn btn-sm btn-outline-primary">Browse packages</a>
                                        </div>
                                    </div>
                                )}

<div className="d-flex justify-content-between small fw-semibold mb-3">
                                    <span>Service</span>
                                    <span>{data.service_type}</span>
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
                                                ? localDateString(date)
                                                : "";

                                            const selected =
                                                selectedDate === value;
                                            const past = isPastDate(date);
                                            const fullyBooked = isFullyBookedDate(value);

                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        value || "empty-" + index
                                                    }
                                                    disabled={!date || past || fullyBooked}
                                                    title={
                                                        fullyBooked
                                                            ? "Fully booked"
                                                            : past
                                                              ? "Past date"
                                                              : date
                                                                ? "Available"
                                                                : undefined
                                                    }
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
                                                            : fullyBooked
                                                              ? "#fde7e7"
                                                              : past
                                                                ? "#f1f1f3"
                                                                : "#fff",
                                                        color: selected
                                                            ? "#fff"
                                                            : fullyBooked
                                                              ? "#bd3a3a"
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
                                            const fullyBooked =
                                                isTimeSlotFullyBooked(slot.label);

                                            return (
                                                <button
                                                    key={slot.label}
                                                    type="button"
                                                    disabled={
                                                        !selectedDate ||
                                                        !slot.available ||
                                                        fullyBooked
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
                                                            : fullyBooked
                                                              ? "#fde7e7"
                                                              : slot.available
                                                                ? "#fff"
                                                                : "#f6f6f7",
                                                        color: selected
                                                            ? "#0d6efd"
                                                            : fullyBooked
                                                              ? "#bd3a3a"
                                                              : slot.available
                                                                ? "#212529"
                                                                : "#b0b0b4",
                                                        borderRadius: "8px",
                                                        fontSize: "0.72rem",
                                                    }}
                                                >
                                                    <span>{slot.label}</span>

                                                    <span
                                                        className={
                                                            slot.available && !fullyBooked
                                                                ? "text-success"
                                                                : "text-danger"
                                                        }
                                                    >
                                                        {!slot.available || fullyBooked
                                                            ? "Fully booked"
                                                            : "Available"}
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
