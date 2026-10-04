import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { useForm } from "@inertiajs/react";

const serviceTypes = [
    "Installation",
    "Site Inspection",
    "Maintenance",
    "Repair",
    "Consultation",
    "Other",
];

const sectionTitleStyle = {
    fontFamily: "Outfit, sans-serif",
    fontSize: "1rem",
    fontWeight: 800,
    marginBottom: "1rem",
};

const fieldStyle = {
    backgroundColor: "#f1f1f3",
    border: "1px solid #e3e3e6",
    borderRadius: "12px",
    minHeight: "44px",
};

export default function Inquiry({ customer, item }) {
    const today = new Date().toISOString().split("T")[0];

    const { data, setData, post, processing, errors } = useForm({
        item_type: item?.type ?? "",
        item_id: item?.id ?? "",
        customer_name: customer?.name ?? "",
        customer_phone: customer?.phone ?? "",
        customer_email: customer?.email ?? "",
        street_address: "",
        city: "",
        service_type: "Installation",
        preferred_date: "",
        notes: "",
    });

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
                    backgroundColor: "#f7f7f8",
                    minHeight: "65vh",
                }}
            >
                <div className="container py-4 py-md-5">
                    <div className="row g-4 align-items-start">
                        <div className="col-lg-7">
                            <div
                                className="bg-white border rounded-4 p-3 p-md-4"
                                style={{
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <div className="mb-4">
                                    <div className="small text-uppercase fw-bold text-primary mb-1">
                                        SecureView
                                    </div>

                                    <h1
                                        className="fw-bold mb-1"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                            fontSize: "1.8rem",
                                        }}
                                    >
                                        BOOKING / INQUIRY
                                    </h1>

                                    <p className="text-muted mb-0 small">
                                        Tell us what service you need and when
                                        you would like us to assist.
                                    </p>
                                </div>

                                {errors.inquiry && (
                                    <div className="alert alert-danger">
                                        {errors.inquiry}
                                    </div>
                                )}

                                <form onSubmit={submit}>
                                    <div className="mb-4">
                                        <div style={sectionTitleStyle}>
                                            CUSTOMER'S PERSONAL INFORMATION
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">
                                                    Full Name <span className="text-danger">*</span>
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
                                                <label className="form-label small fw-semibold">
                                                    Phone No. <span className="text-danger">*</span>
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
                                                <label className="form-label small fw-semibold">
                                                    Email Address <span className="text-danger">*</span>
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

                                    <div className="mb-4">
                                        <div style={sectionTitleStyle}>
                                            CUSTOMER'S ADDRESS
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label small fw-semibold">
                                                    Street Address <span className="text-danger">*</span>
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

                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">
                                                    City <span className="text-danger">*</span>
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

                                    <div className="mb-4">
                                        <div style={sectionTitleStyle}>
                                            SERVICE DETAILS
                                        </div>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">
                                                    Service Type <span className="text-danger">*</span>
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

                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">
                                                    Preferred Date <span className="text-danger">*</span>
                                                </label>

                                                <input
                                                    type="date"
                                                    min={today}
                                                    className={
                                                        "form-control " +
                                                        (errors.preferred_date
                                                            ? "is-invalid"
                                                            : "")
                                                    }
                                                    style={fieldStyle}
                                                    value={data.preferred_date}
                                                    onChange={(event) =>
                                                        setData(
                                                            "preferred_date",
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                {errors.preferred_date && (
                                                    <div className="invalid-feedback">
                                                        {errors.preferred_date}
                                                    </div>
                                                )}
                                            </div>

                                            {item && (
                                                <div className="col-12">
                                                    <label className="form-label small fw-semibold">
                                                        Selected Item
                                                    </label>

                                                    <div
                                                        className="d-flex align-items-center gap-3 rounded-3 border p-2"
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
                                                                    width: "58px",
                                                                    height: "58px",
                                                                    objectFit:
                                                                        "cover",
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                                style={{
                                                                    width: "58px",
                                                                    height: "58px",
                                                                }}
                                                            >
                                                                <i
                                                                    className={
                                                                        item.type ===
                                                                        "package"
                                                                            ? "bi bi-box-seam text-secondary"
                                                                            : "bi bi-camera-video text-secondary"
                                                                    }
                                                                ></i>
                                                            </div>
                                                        )}

                                                        <div>
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
                                                <label className="form-label small fw-semibold">
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
                                                    placeholder="Tell us anything else we should know."
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
                                className="bg-white border rounded-4 p-3 p-md-4 sticky-lg-top"
                                style={{
                                    top: "20px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                                }}
                            >
                                <h4
                                    className="fw-bold mb-3"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    INQUIRY SUMMARY
                                </h4>

                                <div
                                    className="rounded-3 p-3 mb-3"
                                    style={{
                                        backgroundColor: "#f6f6f7",
                                    }}
                                >
                                    <div className="small text-muted mb-1">
                                        CUSTOMER
                                    </div>

                                    <div className="fw-bold">
                                        {data.customer_name || "Your Name"}
                                    </div>

                                    <div className="small text-muted">
                                        {data.customer_email ||
                                            "your@email.com"}
                                    </div>
                                </div>

                                <div
                                    className="rounded-3 p-3 mb-3"
                                    style={{
                                        backgroundColor: "#f6f6f7",
                                    }}
                                >
                                    <div className="small text-muted mb-1">
                                        SERVICE
                                    </div>

                                    <div className="fw-bold">
                                        {data.service_type}
                                    </div>

                                    <div className="small text-muted mt-2">
                                        Preferred Date
                                    </div>

                                    <div className="fw-semibold">
                                        {data.preferred_date
                                            ? new Date(
                                                  data.preferred_date +
                                                      "T00:00:00"
                                              ).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                              })
                                            : "Not selected"}
                                    </div>
                                </div>

                                {item ? (
                                    <div className="border rounded-3 p-3 mb-3">
                                        <div className="d-flex gap-3 align-items-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="rounded-2"
                                                    style={{
                                                        width: "64px",
                                                        height: "64px",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-2 bg-secondary-subtle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: "64px",
                                                        height: "64px",
                                                    }}
                                                >
                                                    <i className="bi bi-camera-video text-secondary"></i>
                                                </div>
                                            )}

                                            <div>
                                                <div className="small text-primary text-uppercase fw-bold">
                                                    {item.type}
                                                </div>

                                                <div className="fw-bold">
                                                    {item.name}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="rounded-3 p-3 mb-3"
                                        style={{
                                            backgroundColor: "#eef7ff",
                                        }}
                                    >
                                        <div className="fw-bold small mb-1">
                                            GENERAL INQUIRY
                                        </div>

                                        <div className="small text-muted">
                                            You can use this form to ask about
                                            SecureView services without a
                                            specific product.
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="rounded-3 p-3"
                                    style={{
                                        backgroundColor: "#eef7ff",
                                    }}
                                >
                                    <div className="fw-bold small mb-2">
                                        <i className="bi bi-check-circle text-primary me-2"></i>
                                        WHY CHOOSE US?
                                    </div>

                                    <div className="small text-muted mb-1">
                                        ✓ Certified Technicians
                                    </div>

                                    <div className="small text-muted mb-1">
                                        ✓ Professional Installation
                                    </div>

                                    <div className="small text-muted">
                                        ✓ Reliable Service
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
