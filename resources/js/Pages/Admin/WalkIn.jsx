import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import ServiceLocationPicker from "../../Components/GoogleMaps/ServiceLocation";
import { router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const DEFAULT_TIME_SLOTS = [
    "08:00 AM - 11:00 AM",
    "11:00 AM - 02:00 PM",
    "02:00 PM - 05:00 PM",
];

const SERVICE_TYPES = [
    "Installation",
    "Site Inspection",
    "Maintenance",
    "Repair",
    "Consultation",
    "Other",
];

const money = (value) => "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const localDateString = (date) => {
    if (!date) return "";
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
};

const formatDateLabel = (value) => {
    if (!value) return "";
    return new Date(value + "T00:00:00").toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

function CustomerAccountPicker({ customers = [], selectedId = "", onSelect, label = "Existing customer account (optional)" }) {
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const selected = customers.find((customer) => String(customer.id) === String(selectedId));

    const filteredCustomers = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        const matches = customers.filter((customer) => {
            const haystack = [customer.name, customer.email, customer.phone]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase();
            return !needle || haystack.includes(needle);
        });
        return matches.slice(0, 12);
    }, [customers, query]);

    const choose = (customer) => {
        onSelect(customer || null);
        setQuery("");
        setExpanded(false);
    };

    return (
        <div className="mb-3">
            <label className="form-label fw-semibold">{label}</label>
            {!expanded ? (
                <div className="border rounded-3 p-3 bg-light d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-start gap-2">
                        <i className={"bi fs-5 " + (selected ? "bi-person-check-fill text-primary" : "bi-person-circle text-secondary")} aria-hidden="true"></i>
                        <div>
                            <div className="fw-semibold">{selected ? selected.name : "Guest customer / no account"}</div>
                            <div className="small text-muted">
                                {selected
                                    ? [selected.email, selected.phone].filter(Boolean).join(" · ") || "No contact details saved on this account."
                                    : "Record this transaction without linking it to an online account."}
                            </div>
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setQuery(""); setExpanded(true); }}>
                            {selected ? "Change account" : "Choose existing account"}
                        </button>
                        {selected && (
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => choose(null)}>
                                Use guest
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="border rounded-3 p-3 bg-white">
                    <div className="input-group mb-2">
                        <span className="input-group-text bg-light"><i className="bi bi-search" aria-hidden="true"></i></span>
                        <input
                            autoFocus
                            type="search"
                            className="form-control"
                            placeholder="Search name, email, or mobile number"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label="Search existing customer accounts"
                        />
                        <button type="button" className="btn btn-outline-secondary" onClick={() => { setExpanded(false); setQuery(""); }}>
                            Cancel
                        </button>
                    </div>
                    <div className="list-group" style={{ maxHeight: 250, overflowY: "auto" }}>
                        {filteredCustomers.map((customer) => (
                            <button
                                type="button"
                                key={customer.id}
                                className="list-group-item list-group-item-action text-start"
                                onClick={() => choose(customer)}
                            >
                                <div className="fw-semibold">{customer.name}</div>
                                <div className="small text-muted">{[customer.email, customer.phone].filter(Boolean).join(" · ") || "No email or phone saved"}</div>
                            </button>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <div className="list-group-item small text-muted">No customer accounts match that search.</div>
                        )}
                    </div>
                    <div className="d-flex justify-content-between align-items-center gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-link text-decoration-none px-0" onClick={() => choose(null)}>
                            Continue as guest / no account
                        </button>
                        <span className="small text-muted">{filteredCustomers.length} shown</span>
                    </div>
                </div>
            )}
            <div className="form-text">Selecting an account fills the customer name, phone number, and email below. You can still correct the contact details before saving.</div>
        </div>
    );
}

function BookingDateTimePicker({
    valueDate,
    valueTime,
    onChange,
    todayDate,
    timeSlots = DEFAULT_TIME_SLOTS,
    unavailableDates = [],
    unavailableTimeSlots = {},
    noTechniciansAvailable = false,
    errorDate,
    errorTime,
}) {
    const [open, setOpen] = useState(false);
    const today = todayDate ? new Date(todayDate + "T00:00:00") : new Date();
    const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [draftDate, setDraftDate] = useState(valueDate || "");
    const [draftTime, setDraftTime] = useState(valueTime || "");

    const calendarDays = useMemo(() => {
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        const days = Array.from({ length: firstDay }, () => null);
        for (let day = 1; day <= daysInMonth; day += 1) {
            days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
        }
        return days;
    }, [calendarMonth]);

    const unavailableDateSet = useMemo(() => new Set((unavailableDates || []).map(String)), [unavailableDates]);
    const monthLabel = calendarMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    const isPastDate = (date) => Boolean(date) && localDateString(date) < (todayDate || localDateString(today));
    const isFullyBookedDate = (dateValue) => Boolean(dateValue) && (
        noTechniciansAvailable || unavailableDateSet.has(dateValue)
    );
    const isTimeSlotUnavailable = (timeSlot) => Boolean(draftDate) && (
        isFullyBookedDate(draftDate) ||
        (unavailableTimeSlots?.[draftDate] || []).includes(timeSlot)
    );

    const openPicker = () => {
        const date = valueDate ? new Date(valueDate + "T00:00:00") : today;
        setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        setDraftDate(valueDate || "");
        setDraftTime(valueTime || "");
        setOpen(true);
    };

    const selectDate = (date) => {
        if (!date || isPastDate(date)) return;
        const value = localDateString(date);
        if (isFullyBookedDate(value)) return;
        setDraftDate(value);
        setDraftTime("");
    };

    const confirmSelection = () => {
        if (!draftDate || !draftTime || isFullyBookedDate(draftDate) || isTimeSlotUnavailable(draftTime)) return;
        onChange({ preferred_date: draftDate, preferred_time: draftTime });
        setOpen(false);
    };

    return (
        <div>
            <label className="form-label fw-semibold">Preferred date &amp; time *</label>
            <button
                type="button"
                className={"form-control text-start " + ((errorDate || errorTime) ? "is-invalid" : "")}
                onClick={openPicker}
                disabled={noTechniciansAvailable}
            >
                <i className="bi bi-calendar-event me-2 text-primary" aria-hidden="true"></i>
                {valueDate && valueTime
                    ? formatDateLabel(valueDate) + " · " + valueTime
                    : "Select an available date and time"}
            </button>
            {errorDate && <div className="small text-danger mt-1">{errorDate}</div>}
            {errorTime && <div className="small text-danger mt-1">{errorTime}</div>}
            {noTechniciansAvailable && <div className="small text-danger mt-1">No technicians are currently available for service bookings.</div>}
            {!noTechniciansAvailable && <div className="form-text">Dates and time slots already at capacity or blocked by Admin cannot be selected.</div>}

            {open && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2100, padding: "1rem" }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-4 border p-3"
                        style={{ width: "100%", maxWidth: 620, boxShadow: "0 15px 50px rgba(0,0,0,0.2)" }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div className="small text-uppercase fw-bold text-primary">Service schedule</div>
                                <div className="fw-bold">Choose date and available time</div>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>Close</button>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-7">
                                <div className="border rounded-3 p-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light border"
                                            disabled={calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth()}
                                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                            aria-label="Previous month"
                                        >‹</button>
                                        <div className="fw-bold small">{monthLabel}</div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light border"
                                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                            aria-label="Next month"
                                        >›</button>
                                    </div>
                                    <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                                        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                                            <div key={day + index} className="text-center text-muted fw-bold" style={{ fontSize: "0.7rem", padding: 3 }}>{day}</div>
                                        ))}
                                        {calendarDays.map((date, index) => {
                                            const value = date ? localDateString(date) : "";
                                            const selected = draftDate === value;
                                            const past = date && isPastDate(date);
                                            const booked = date && isFullyBookedDate(value);
                                            return (
                                                <button
                                                    type="button"
                                                    key={value || "empty-" + index}
                                                    disabled={!date || past || booked}
                                                    title={booked ? "Fully booked" : past ? "Past date" : "Available"}
                                                    onClick={() => selectDate(date)}
                                                    className="btn btn-sm"
                                                    style={{
                                                        minHeight: 34,
                                                        padding: 0,
                                                        borderRadius: 8,
                                                        border: selected ? "1px solid #0d6efd" : "1px solid transparent",
                                                        backgroundColor: selected ? "#0d6efd" : booked ? "#fde7e7" : past ? "#f1f1f3" : "#fff",
                                                        color: selected ? "#fff" : booked ? "#bd3a3a" : past ? "#b7b8bd" : "#212529",
                                                        fontSize: "0.78rem",
                                                    }}
                                                >{date?.getDate() ?? ""}</button>
                                            );
                                        })}
                                    </div>
                                    <div className="d-flex justify-content-center gap-3 mt-3 small">
                                        <span className="text-success">● Available</span>
                                        <span className="text-danger">● Fully booked</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-5">
                                <div className="border rounded-3 p-2 h-100">
                                    <div className="small fw-bold mb-2">TIME SLOT</div>
                                    <div className="d-flex flex-column gap-2">
                                        {timeSlots.map((slot) => {
                                            const selected = draftTime === slot;
                                            const booked = isTimeSlotUnavailable(slot);
                                            return (
                                                <button
                                                    type="button"
                                                    key={slot}
                                                    disabled={!draftDate || booked}
                                                    onClick={() => setDraftTime(slot)}
                                                    className="btn btn-sm text-start d-flex justify-content-between align-items-center"
                                                    style={{
                                                        border: selected ? "1px solid #0d6efd" : "1px solid #e2e3e6",
                                                        backgroundColor: selected ? "#edf5ff" : booked ? "#fde7e7" : "#fff",
                                                        color: selected ? "#0d6efd" : booked ? "#bd3a3a" : "#212529",
                                                        borderRadius: 8,
                                                        fontSize: "0.75rem",
                                                    }}
                                                >
                                                    <span>{slot}</span>
                                                    <span className="small">{booked ? "Full" : "Available"}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3 gap-2">
                            <div className="small text-muted">
                                {draftDate ? formatDateLabel(draftDate) : "Choose a date"}{draftTime ? " · " + draftTime : ""}
                            </div>
                            <button type="button" className="btn btn-primary fw-semibold px-4" onClick={confirmSelection} disabled={!draftDate || !draftTime}>
                                Confirm schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const emptySale = () => ({
    customer_user_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    payment_method: "cash",
    notes: "",
});

const emptyService = (initialDate = "") => ({
    customer_user_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service_type: "Repair",
    service_location_type: "in_shop",
    street_address: "",
    address_details: "",
    city: "",
    service_latitude: "",
    service_longitude: "",
    google_place_id: "",
    preferred_date: "",
    preferred_time: "",
    urgency: "normal",
    item_type: "",
    item_id: "",
    item_name: "",
    preferred_payment_method: "gcash",
    notes: "",
});

export default function WalkIn({
    catalogItems = [],
    customers = [],
    bookingTimeSlots = DEFAULT_TIME_SLOTS,
    todayDate,
    urgencyFees = {},
    unavailableDates = [],
    unavailableTimeSlots = {},
    noTechniciansAvailable = false,
}) {
    const { props } = usePage();
    const [cart, setCart] = useState([]);
    const [sale, setSale] = useState(emptySale);
    const [service, setService] = useState(() => emptyService(todayDate));
    const [submitting, setSubmitting] = useState("");
    const [catalogFilter, setCatalogFilter] = useState("all");
    const [catalogSearch, setCatalogSearch] = useState("");

    const total = useMemo(
        () => cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
        [cart]
    );

    const counts = useMemo(() => ({
        products: catalogItems.filter((item) => item.type === "product").length,
        packages: catalogItems.filter((item) => item.type === "package").length,
    }), [catalogItems]);

    const filteredCatalogItems = useMemo(() => {
        const needle = catalogSearch.trim().toLocaleLowerCase();
        return catalogItems.filter((item) => {
            if (catalogFilter !== "all" && item.type !== catalogFilter) return false;
            const inclusions = (item.includes || []).map((included) => included.name).join(" ");
            const searchable = [item.name, item.category, item.brand, inclusions, item.type]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase();
            return !needle || searchable.includes(needle);
        });
    }, [catalogItems, catalogFilter, catalogSearch]);

    const selectedServiceItem = catalogItems.find((item) =>
        item.type === service.item_type && String(item.id) === String(service.item_id)
    );
    const selectedUrgencyFee = Math.max(0, Number(urgencyFees?.[service.urgency] || 0));
    const requiresPaymentPreference = service.service_type === "Installation" || selectedUrgencyFee > 0;

    const addItem = (item) => {
        if (Number(item.stock) < 1) return;
        setCart((current) => {
            const existing = current.find((row) => row.type === item.type && row.id === item.id);
            if (existing) {
                return current.map((row) =>
                    row.type === item.type && row.id === item.id
                        ? { ...row, quantity: Math.min(Number(row.quantity) + 1, Number(item.stock)) }
                        : row
                );
            }
            return [...current, { ...item, quantity: 1 }];
        });
    };

    const updateQuantity = (item, quantity) => {
        setCart((current) => current.map((row) =>
            row.type === item.type && row.id === item.id
                ? { ...row, quantity: Math.max(1, Math.min(Number(quantity) || 1, Number(row.stock))) }
                : row
        ));
    };

    const chooseSaleCustomer = (customer) => {
        setSale((current) => ({
            ...current,
            customer_user_id: customer ? String(customer.id) : "",
            customer_name: customer?.name || "",
            customer_phone: customer?.phone || "",
            customer_email: customer?.email || "",
        }));
    };

    const chooseServiceCustomer = (customer) => {
        setService((current) => ({
            ...current,
            customer_user_id: customer ? String(customer.id) : "",
            customer_name: customer?.name || "",
            customer_phone: customer?.phone || "",
            customer_email: customer?.email || "",
        }));
    };

    const setSaleField = (field, value) => setSale((current) => ({ ...current, [field]: value }));
    const setServiceField = (field, value) => setService((current) => ({ ...current, [field]: value }));

    const changeServiceType = (serviceType) => {
        setService((current) => ({
            ...current,
            service_type: serviceType,
            item_type: "",
            item_id: "",
            item_name: "",
            preferred_payment_method: serviceType === "Installation" || Number(urgencyFees?.[current.urgency] || 0) > 0
                ? (current.preferred_payment_method || "gcash")
                : "",
        }));
    };

    const submitSale = (event) => {
        event.preventDefault();
        if (!cart.length || submitting) return;
        setSubmitting("sale");
        router.post("/admin/walk-in/sales", {
            ...sale,
            items: cart.map(({ type, id, quantity }) => ({ type, id, quantity })),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSale(emptySale());
            },
            onFinish: () => setSubmitting(""),
        });
    };

    const submitService = (event) => {
        event.preventDefault();
        if (submitting || (service.service_type === "Installation" && (!service.item_type || !service.item_id))) return;
        setSubmitting("service");
        router.post("/admin/walk-in/services", service, {
            preserveScroll: true,
            onSuccess: () => setService(emptyService(todayDate)),
            onFinish: () => setSubmitting(""),
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="walk-in" />
                    </aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">NETMAX TRADING ADMIN</div>
                                <h1 className="fw-bold mb-1">WALK-IN POS &amp; SERVICE INTAKE</h1>
                                <div className="small text-muted">Record physical-store sales and customer service bookings in SecureView.</div>
                            </div>
                            <span className="badge text-bg-primary align-self-start align-self-lg-center">Staff workspace</span>
                        </div>

                        {props.flash?.success && (
                            <div className="alert alert-success">
                                {props.flash.success}
                                {props.flash?.sale_invoice_url && (
                                    <div className="mt-2">
                                        <a className="alert-link fw-semibold" href={props.flash.sale_invoice_url} target="_blank" rel="noreferrer">
                                            <i className="bi bi-printer me-1"></i>Open / print invoice for {props.flash.sale_order_number}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                        {Object.keys(props.errors || {}).length > 0 && (
                            <div className="alert alert-danger">
                                <div className="fw-semibold mb-1">Please review the following:</div>
                                <ul className="mb-0">{Object.values(props.errors).map((error, index) => <li key={index}>{error}</li>)}</ul>
                            </div>
                        )}

                        <div className="row g-3 align-items-start">
                            <div className="col-12 col-xxl-7">
                                <section className="bg-white border rounded-3 p-3 p-lg-4 mb-3">
                                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                        <div>
                                            <div className="small text-primary fw-bold text-uppercase">Point of sale</div>
                                            <h2 className="h5 fw-bold mb-1">Walk-in product sale</h2>
                                            <p className="small text-muted mb-0">Sell products and ready-made packages at the physical counter. Stock is deducted after a paid sale is recorded.</p>
                                        </div>
                                        <i className="bi bi-cart-check fs-2 text-primary" aria-hidden="true"></i>
                                    </div>

                                    <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                                        <div className="input-group flex-grow-1">
                                            <span className="input-group-text bg-light"><i className="bi bi-search" aria-hidden="true"></i></span>
                                            <input
                                                type="search"
                                                className="form-control"
                                                placeholder="Search products, packages, or included items"
                                                value={catalogSearch}
                                                onChange={(event) => setCatalogSearch(event.target.value)}
                                                aria-label="Search products and packages for sale"
                                            />
                                        </div>
                                        <div className="btn-group flex-shrink-0" role="group" aria-label="Filter catalog items">
                                            <button type="button" className={"btn btn-sm " + (catalogFilter === "all" ? "btn-primary" : "btn-outline-primary")} aria-pressed={catalogFilter === "all"} onClick={() => setCatalogFilter("all")}>
                                                All ({catalogItems.length})
                                            </button>
                                            <button type="button" className={"btn btn-sm " + (catalogFilter === "product" ? "btn-primary" : "btn-outline-primary")} aria-pressed={catalogFilter === "product"} onClick={() => setCatalogFilter("product")}>
                                                Products ({counts.products})
                                            </button>
                                            <button type="button" className={"btn btn-sm " + (catalogFilter === "package" ? "btn-primary" : "btn-outline-primary")} aria-pressed={catalogFilter === "package"} onClick={() => setCatalogFilter("package")}>
                                                Packages ({counts.packages})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        {filteredCatalogItems.map((item) => (
                                            <div className="col-12 col-md-6" key={item.type + "-" + item.id}>
                                                <article className="border rounded-3 p-3 h-100 d-flex flex-column">
                                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                                        <div className="fw-semibold lh-sm">{item.name}</div>
                                                        <span className={"badge flex-shrink-0 " + (item.type === "package" ? "text-bg-info" : "text-bg-light text-dark")}>
                                                            {item.type === "package" ? "Package" : "Product"}
                                                        </span>
                                                    </div>
                                                    {item.type === "package" && item.includes?.length > 0 && (
                                                        <div className="small text-muted mt-2">
                                                            <span className="fw-semibold">Includes: </span>
                                                            {item.includes.map((included) => included.quantity + " × " + included.name).join(", ")}
                                                        </div>
                                                    )}
                                                    <div className="d-flex justify-content-between align-items-center gap-2 mt-2">
                                                        <div className="fw-bold text-primary">{money(item.price)}</div>
                                                        <span className={"small fw-semibold " + (Number(item.stock) > 0 ? "text-success" : "text-danger")}>
                                                            {Number(item.stock) > 0 ? item.stock + " available" : "Out of stock"}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm mt-3"
                                                        disabled={Number(item.stock) < 1}
                                                        onClick={() => addItem(item)}
                                                    >
                                                        <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                                                        {cart.some((row) => row.type === item.type && row.id === item.id) ? "Add another" : "Add to sale"}
                                                    </button>
                                                </article>
                                            </div>
                                        ))}
                                        {filteredCatalogItems.length === 0 && (
                                            <div className="col-12">
                                                <div className="border rounded-3 bg-light p-4 text-center">
                                                    <i className="bi bi-search fs-3 text-muted" aria-hidden="true"></i>
                                                    <div className="fw-semibold mt-2">No matching catalog items</div>
                                                    <div className="small text-muted">Try another search or switch between Products and Packages.</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={submitSale}>
                                        <CustomerAccountPicker customers={customers} selectedId={sale.customer_user_id} onSelect={chooseSaleCustomer} />
                                        <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                                            <h3 className="h6 fw-bold mb-0">Sale items</h3>
                                            <span className="badge text-bg-light text-dark">{cart.length} line item{cart.length === 1 ? "" : "s"}</span>
                                        </div>
                                        {cart.length ? (
                                            <div className="table-responsive mb-3">
                                                <table className="table table-sm table-hover align-middle">
                                                    <thead className="table-light">
                                                        <tr><th>Item</th><th style={{ width: 105 }}>Qty</th><th className="text-end">Amount</th><th></th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {cart.map((item) => (
                                                            <tr key={item.type + "-" + item.id}>
                                                                <td>
                                                                    <div className="fw-semibold">{item.name}</div>
                                                                    <div className="small text-muted">{item.type === "package" ? "Package" : "Product"} · {money(item.price)} each</div>
                                                                </td>
                                                                <td>
                                                                    <input aria-label={"Quantity for " + item.name} className="form-control form-control-sm" type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => updateQuantity(item, event.target.value)} />
                                                                </td>
                                                                <td className="text-end fw-semibold">{money(item.price * item.quantity)}</td>
                                                                <td>
                                                                    <button type="button" className="btn btn-sm btn-outline-danger" aria-label={"Remove " + item.name} onClick={() => setCart((current) => current.filter((row) => row.type !== item.type || row.id !== item.id))}>
                                                                        <i className="bi bi-trash" aria-hidden="true"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="alert alert-light border small mb-3">Add at least one product or package to begin a sale.</div>
                                        )}

                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Customer name *</label>
                                                <input className={"form-control " + (props.errors?.customer_name ? "is-invalid" : "")} required maxLength="120" value={sale.customer_name} onChange={(event) => setSaleField("customer_name", event.target.value)} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Contact number</label>
                                                <input className="form-control" maxLength="30" value={sale.customer_phone} onChange={(event) => setSaleField("customer_phone", event.target.value)} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Email (optional)</label>
                                                <input type="email" className="form-control" value={sale.customer_email} onChange={(event) => setSaleField("customer_email", event.target.value)} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Payment method *</label>
                                                <select className="form-select" value={sale.payment_method} onChange={(event) => setSaleField("payment_method", event.target.value)}>
                                                    <option value="cash">Cash</option>
                                                    <option value="gcash">GCash</option>
                                                    <option value="card">Card</option>
                                                    <option value="maya">Maya</option>
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Notes (optional)</label>
                                                <textarea className="form-control" rows="2" value={sale.notes} onChange={(event) => setSaleField("notes", event.target.value)} />
                                            </div>
                                        </div>
                                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 border-top pt-3 mt-3">
                                            <div>
                                                <div className="small text-muted text-uppercase">Total due</div>
                                                <div className="h3 fw-bold text-success mb-0">{money(total)}</div>
                                            </div>
                                            <button className="btn btn-primary fw-semibold px-4" type="submit" disabled={!cart.length || !sale.customer_name.trim() || submitting !== ""}>
                                                {submitting === "sale" ? "Recording sale..." : "Record paid sale"}
                                            </button>
                                        </div>
                                        <div className="small text-muted mt-2">The sale is recorded as paid and deducts the selected product and package stock. Confirm that payment was received before submitting.</div>
                                    </form>
                                </section>
                            </div>

                            <div className="col-12 col-xxl-5">
                                <section className="bg-white border rounded-3 p-3 p-lg-4">
                                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                        <div>
                                            <div className="small text-primary fw-bold text-uppercase">Service intake</div>
                                            <h2 className="h5 fw-bold mb-1">Walk-in service booking</h2>
                                            <p className="small text-muted mb-0">Use the same customer details, service information, priority, and schedule requirements as the customer booking form.</p>
                                        </div>
                                        <i className="bi bi-calendar2-check fs-2 text-primary" aria-hidden="true"></i>
                                    </div>

                                    <form onSubmit={submitService}>
                                        <CustomerAccountPicker customers={customers} selectedId={service.customer_user_id} onSelect={chooseServiceCustomer} />
                                        <div className="mb-3">
                                            <div className="small fw-bold text-uppercase text-secondary mb-2">Customer's personal information</div>
                                            <div className="row g-2">
                                                <div className="col-12">
                                                    <label className="form-label fw-semibold">Full name *</label>
                                                    <input className={"form-control " + (props.errors?.customer_name ? "is-invalid" : "")} required maxLength="120" value={service.customer_name} onChange={(event) => setServiceField("customer_name", event.target.value)} />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Phone number *</label>
                                                    <input className={"form-control " + (props.errors?.customer_phone ? "is-invalid" : "")} required inputMode="numeric" maxLength="11" placeholder="09XXXXXXXXX" value={service.customer_phone} onChange={(event) => setServiceField("customer_phone", event.target.value)} />
                                                    {props.errors?.customer_phone && <div className="invalid-feedback">{props.errors.customer_phone}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Email address *</label>
                                                    <input type="email" className={"form-control " + (props.errors?.customer_email ? "is-invalid" : "")} required maxLength="255" value={service.customer_email} onChange={(event) => setServiceField("customer_email", event.target.value)} />
                                                    {props.errors?.customer_email && <div className="invalid-feedback">{props.errors.customer_email}</div>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-top pt-3 mb-3">
                                            <div className="small fw-bold text-uppercase text-secondary mb-2">Service location</div>
                                            <label className="form-label fw-semibold">Where will the service take place? *</label>
                                            <select
                                                className="form-select mb-2"
                                                value={service.service_location_type}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setService((current) => ({
                                                        ...current,
                                                        service_location_type: value,
                                                        street_address: "",
                                                        address_details: "",
                                                        city: "",
                                                        service_latitude: "",
                                                        service_longitude: "",
                                                        google_place_id: "",
                                                    }));
                                                }}
                                            >
                                                <option value="in_shop">In-shop drop-off</option>
                                                <option value="customer_site">Customer site visit</option>
                                            </select>
                                            {service.service_location_type === "customer_site" ? (
                                                <>
                                                    <div className="row g-2">
                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">Full service address *</label>
                                                            <input className={"form-control " + (props.errors?.street_address ? "is-invalid" : "")} required maxLength="255" placeholder="House/Unit, Street, Barangay" value={service.street_address} onChange={(event) => setServiceField("street_address", event.target.value)} />
                                                            {props.errors?.street_address && <div className="invalid-feedback">{props.errors.street_address}</div>}
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">City / municipality *</label>
                                                            <input className={"form-control " + (props.errors?.city ? "is-invalid" : "")} required maxLength="120" value={service.city} onChange={(event) => setServiceField("city", event.target.value)} />
                                                            {props.errors?.city && <div className="invalid-feedback">{props.errors.city}</div>}
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">House / unit / landmark</label>
                                                            <input className="form-control" maxLength="500" value={service.address_details} onChange={(event) => setServiceField("address_details", event.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <ServiceLocationPicker
                                                            streetAddress={service.street_address}
                                                            city={service.city}
                                                            latitude={service.service_latitude}
                                                            longitude={service.service_longitude}
                                                            placeId={service.google_place_id}
                                                            apiErrors={props.errors || {}}
                                                            locationType="service"
                                                            onChange={(changes) => setService((current) => ({ ...current, ...changes }))}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="alert alert-info small mb-0">
                                                    <i className="bi bi-shop me-2" aria-hidden="true"></i>
                                                    The customer will drop off the equipment at the Netmax Trading service counter. The shop address is saved automatically.
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-top pt-3 mb-3">
                                            <div className="small fw-bold text-uppercase text-secondary mb-2">Service details</div>
                                            <div className="row g-2">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Service type *</label>
                                                    <select className="form-select" required value={service.service_type} onChange={(event) => changeServiceType(event.target.value)}>
                                                        {SERVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Priority *</label>
                                                    <select className="form-select" value={service.urgency} onChange={(event) => setServiceField("urgency", event.target.value)}>
                                                        <option value="normal">Normal — routine service</option>
                                                        <option value="urgent">Urgent {Number(urgencyFees.urgent || 0) > 0 ? "— " + money(urgencyFees.urgent) : ""}</option>
                                                        <option value="emergency">Emergency {Number(urgencyFees.emergency || 0) > 0 ? "— " + money(urgencyFees.emergency) : ""}</option>
                                                    </select>
                                                </div>
                                                <div className="col-12">
                                                    <BookingDateTimePicker
                                                        valueDate={service.preferred_date}
                                                        valueTime={service.preferred_time}
                                                        todayDate={todayDate}
                                                        timeSlots={bookingTimeSlots}
                                                        unavailableDates={unavailableDates}
                                                        unavailableTimeSlots={unavailableTimeSlots}
                                                        noTechniciansAvailable={noTechniciansAvailable}
                                                        errorDate={props.errors?.preferred_date}
                                                        errorTime={props.errors?.preferred_time}
                                                        onChange={(changes) => setService((current) => ({ ...current, ...changes }))}
                                                    />
                                                </div>
                                                {service.service_type === "Installation" ? (
                                                    <div className="col-12">
                                                        <label className="form-label fw-semibold">Product or package for installation *</label>
                                                        <select
                                                            className={"form-select " + (props.errors?.item_id ? "is-invalid" : "")}
                                                            required
                                                            value={service.item_type && service.item_id ? service.item_type + ":" + service.item_id : ""}
                                                            onChange={(event) => {
                                                                const [type, id] = event.target.value.split(":");
                                                                setService((current) => ({ ...current, item_type: type || "", item_id: id || "" }));
                                                            }}
                                                        >
                                                            <option value="">Select a product or package</option>
                                                            {catalogItems.map((item) => (
                                                                <option key={item.type + ":" + item.id} value={item.type + ":" + item.id} disabled={Number(item.stock) < 1}>
                                                                    {(item.type === "package" ? "PACKAGE · " : "PRODUCT · ") + item.name + " — " + money(item.price) + " · " + item.stock + " available"}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {props.errors?.item_id && <div className="invalid-feedback">{props.errors.item_id}</div>}
                                                        {selectedServiceItem ? (
                                                            <div className="border rounded-3 bg-light p-3 mt-2">
                                                                <div className="d-flex justify-content-between gap-2">
                                                                    <div className="fw-semibold">{selectedServiceItem.name}</div>
                                                                    <span className="badge text-bg-primary">{selectedServiceItem.type === "package" ? "Package" : "Product"}</span>
                                                                </div>
                                                                <div className="small text-muted mt-1">{money(selectedServiceItem.price)} · {selectedServiceItem.stock} available</div>
                                                                {selectedServiceItem.type === "package" && selectedServiceItem.includes?.length > 0 && (
                                                                    <div className="small mt-2"><span className="fw-semibold">Package includes: </span>{selectedServiceItem.includes.map((included) => included.quantity + " × " + included.name).join(", ")}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="form-text">Installations require an available store product or package. This selection will be attached to the service request.</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="col-12">
                                                        <label className="form-label fw-semibold">Device / item (optional)</label>
                                                        <input className="form-control" maxLength="180" placeholder="e.g. 4-channel DVR, camera model, or existing CCTV system" value={service.item_name} onChange={(event) => setServiceField("item_name", event.target.value)} />
                                                    </div>
                                                )}
                                                {requiresPaymentPreference && (
                                                    <div className="col-12">
                                                        <label className="form-label fw-semibold">Preferred payment method *</label>
                                                        <select className="form-select" required value={service.preferred_payment_method} onChange={(event) => setServiceField("preferred_payment_method", event.target.value)}>
                                                            <option value="cash">Cash</option>
                                                            <option value="gcash">GCash</option>
                                                            <option value="card">Credit / Debit Card</option>
                                                            <option value="maya">Maya</option>
                                                        </select>
                                                        <div className="form-text">This records the customer's preferred method only. No payment is collected at service intake; actual payment is recorded against the post-service invoice.</div>
                                                    </div>
                                                )}
                                                {selectedUrgencyFee > 0 && (
                                                    <div className="col-12">
                                                        <div className="alert alert-warning small mb-0">
                                                            <strong>{service.urgency === "emergency" ? "Emergency" : "Urgent"} booking fee: {money(selectedUrgencyFee)}.</strong>
                                                            {" "}The amount is calculated from the Admin booking-fee settings.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-top pt-3">
                                            <label className="form-label fw-semibold">Additional notes (optional)</label>
                                            <textarea className="form-control" rows="3" maxLength="1000" placeholder="Describe the equipment, issue, requested work, or access instructions." value={service.notes} onChange={(event) => setServiceField("notes", event.target.value)} />
                                        </div>
                                        <button
                                            className="btn btn-primary fw-semibold w-100 mt-3"
                                            type="submit"
                                            disabled={
                                                submitting !== "" ||
                                                (service.service_type === "Installation" && (!service.item_type || !service.item_id)) ||
                                                (requiresPaymentPreference && !service.preferred_payment_method) ||
                                                !service.preferred_date ||
                                                !service.preferred_time ||
                                                noTechniciansAvailable
                                            }
                                        >
                                            {submitting === "service" ? "Creating service request..." : "Create walk-in service request"}
                                        </button>
                                        <div className="small text-muted mt-2">
                                            The request enters the existing Admin review, scheduling, and technician assignment workflow. Installation requires a product or package, and no item stock is deducted at booking.
                                        </div>
                                    </form>
                                </section>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
