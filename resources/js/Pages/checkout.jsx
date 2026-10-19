import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link, useForm } from "@inertiajs/react";

const paymentMethods = [
    {
        id: "cash",
        title: "Cash",
        subtitle: "Pay on delivery",
        icon: "bi bi-cash-stack",
    },
    {
        id: "gcash",
        title: "GCash",
        subtitle: "Pay with GCash",
        icon: "bi bi-phone",
    },
    {
        id: "card",
        title: "Card",
        subtitle: "Visa / Mastercard",
        icon: "bi bi-credit-card",
    },
    {
        id: "maya",
        title: "Maya",
        subtitle: "Pay with Maya",
        icon: "bi bi-wallet2",
    },
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

export default function Checkout({
    customer,
    cart,
    success,
    orderNumber,
    paymentMethod,
}) {
    const { data, setData, post, processing, errors } = useForm({
        customer_name: customer?.name ?? "",
        customer_phone: customer?.phone ?? "",
        customer_email: customer?.email ?? "",
        delivery_address: "",
        notes: "",
        payment_method: "cash",
    });

    const items = cart?.items ?? [];
    const subtotal = Number(cart?.subtotal ?? 0);
    const shippingFee = Number(cart?.shipping_fee ?? 0);
    const total = Number(cart?.total ?? 0);

    const totalQuantity = items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
    );

    const submit = (event) => {
        event.preventDefault();

        post("/checkout", {
            preserveScroll: true,
        });
    };

    if (success) {
        const paymentLabel =
            paymentMethod === "gcash"
                ? "GCash"
                : paymentMethod === "card"
                  ? "Card"
                  : paymentMethod === "maya"
                    ? "Maya"
                    : "Cash";

        return (
            <div>
                <Navbar />

                <main
                    style={{
                        backgroundColor: "#f7f7f8",
                        minHeight: "65vh",
                    }}
                >
                    <div className="container py-5">
                        <div
                            className="mx-auto bg-white border rounded-4 p-4 p-md-5 text-center"
                            style={{ maxWidth: "700px" }}
                        >
                            <div
                                className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    backgroundColor: "#eaf8f0",
                                }}
                            >
                                <i
                                    className="bi bi-check-lg text-success"
                                    style={{ fontSize: "2rem" }}
                                ></i>
                            </div>

                            <div className="small text-uppercase fw-bold text-primary mb-2">
                                SecureView
                            </div>

                            <h1
                                className="fw-bold mb-2"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                                ORDER CONFIRMED
                            </h1>

                            <p className="text-muted mb-4">
                                Your order{" "}
                                <strong>{orderNumber}</strong> has been created
                                successfully.
                            </p>

                            <div
                                className="rounded-3 p-3 text-start mb-4"
                                style={{ backgroundColor: "#f6f6f7" }}
                            >
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Payment Method
                                    </span>
                                    <span className="fw-bold">
                                        {paymentLabel}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">
                                        Payment Status
                                    </span>
                                    <span className="fw-bold">
                                        {paymentMethod === "cash"
                                            ? "Pending"
                                            : "Awaiting Payment"}
                                    </span>
                                </div>
                            </div>

                            <p className="small text-muted mb-4">
                                Online payment processing for GCash, Card, and
                                Maya will be connected to the payment gateway
                                next.
                            </p>

                            <Link
                                href="/products"
                                className="btn btn-primary fw-bold px-4"
                            >
                                CONTINUE SHOPPING
                            </Link>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        );
    }

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
                                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
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
                                            CHECKOUT
                                        </h1>

                                        <p className="text-muted mb-0 small">
                                            Complete your order details below.
                                        </p>
                                    </div>

                                    <div
                                        className="rounded-3 px-3 py-2 small fw-bold"
                                        style={{
                                            backgroundColor: "#edf5ff",
                                            color: "#0d6efd",
                                        }}
                                    >
                                        {totalQuantity} item
                                        {totalQuantity === 1 ? "" : "s"}
                                    </div>
                                </div>

                                {(errors.payment || errors.stock || errors.cart) && (
                                    <div className="alert alert-danger mb-4">
                                        {errors.payment || errors.stock || errors.cart}
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
                                                    className={`form-control ${errors.customer_name ? "is-invalid" : ""}`}
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
                                                    className={`form-control ${errors.customer_phone ? "is-invalid" : ""}`}
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
                                                    className={`form-control ${errors.customer_email ? "is-invalid" : ""}`}
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

                                        <label className="form-label small fw-semibold">
                                            Delivery Address <span className="text-danger">*</span>
                                        </label>

                                        <textarea
                                            rows="3"
                                            className={`form-control ${errors.delivery_address ? "is-invalid" : ""}`}
                                            style={{
                                                ...fieldStyle,
                                                resize: "vertical",
                                            }}
                                            placeholder="House/Unit, Street, Barangay, City, Province, ZIP Code"
                                            value={data.delivery_address}
                                            onChange={(event) =>
                                                setData(
                                                    "delivery_address",
                                                    event.target.value
                                                )
                                            }
                                        ></textarea>

                                        {errors.delivery_address && (
                                            <div className="invalid-feedback">
                                                {errors.delivery_address}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div style={sectionTitleStyle}>
                                            PAYMENT METHOD
                                        </div>

                                        <div className="row g-2">
                                            {paymentMethods.map((method) => {
                                                const selected =
                                                    data.payment_method ===
                                                    method.id;

                                                return (
                                                    <div
                                                        key={method.id}
                                                        className="col-6"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="w-100 text-start border rounded-3 p-3"
                                                            style={{
                                                                backgroundColor:
                                                                    selected
                                                                        ? "#edf5ff"
                                                                        : "#fff",
                                                                borderColor:
                                                                    selected
                                                                        ? "#0d6efd"
                                                                        : "#e3e3e6",
                                                            }}
                                                            onClick={() =>
                                                                setData(
                                                                    "payment_method",
                                                                    method.id
                                                                )
                                                            }
                                                        >
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-center rounded-3 bg-light"
                                                                    style={{
                                                                        width: "38px",
                                                                        height: "38px",
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <i
                                                                        className={method.icon}
                                                                        style={{
                                                                            fontSize:
                                                                                "1rem",
                                                                        }}
                                                                    ></i>
                                                                </div>

                                                                <div className="flex-grow-1">
                                                                    <div className="fw-bold small">
                                                                        {
                                                                            method.title
                                                                        }
                                                                    </div>

                                                                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                        {
                                                                            method.subtitle
                                                                        }
                                                                    </div>
                                                                </div>

                                                                <i
                                                                    className={
                                                                        selected
                                                                            ? "bi bi-check-circle-fill text-primary"
                                                                            : "bi bi-circle text-muted"
                                                                    }
                                                                ></i>
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {data.payment_method !== "cash" && (
                                            <div className="small text-muted mt-2">
                                                Online payment will open through
                                                the secure payment gateway once
                                                payment integration is connected.
                                            </div>
                                        )}

                                        {errors.payment_method && (
                                            <div className="text-danger small mt-2">
                                                {errors.payment_method}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="form-label small fw-semibold">
                                            Additional Notes{" "}
                                            <span className="text-muted fw-normal">
                                                (Optional)
                                            </span>
                                        </label>

                                        <textarea
                                            rows="2"
                                            className={`form-control ${errors.notes ? "is-invalid" : ""}`}
                                            style={{
                                                ...fieldStyle,
                                                resize: "vertical",
                                            }}
                                            placeholder="Delivery instructions or other notes"
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

                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold w-100 mt-4 py-2"
                                        disabled={processing}
                                    >
                                        {processing
                                            ? "PROCESSING..."
                                            : data.payment_method === "cash"
                                              ? "PLACE ORDER"
                                              : "CONTINUE TO PAYMENT"}
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
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4
                                        className="fw-bold mb-0"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        CART
                                    </h4>

                                    <Link
                                        href="/cart"
                                        className="small fw-semibold text-decoration-none"
                                    >
                                        Edit Cart
                                    </Link>
                                </div>

                                <div className="d-flex flex-column gap-2">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="border rounded-3 p-2"
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
                                                            width: "58px",
                                                            height: "58px",
                                                            objectFit: "cover",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="rounded-2 d-flex align-items-center justify-content-center bg-secondary-subtle"
                                                        style={{
                                                            width: "58px",
                                                            height: "58px",
                                                            flexShrink: 0,
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

                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="small text-primary text-uppercase fw-bold">
                                                        {item.type}
                                                    </div>

                                                    <div
                                                        className="fw-bold text-truncate"
                                                        style={{
                                                            fontFamily:
                                                                "Outfit, sans-serif",
                                                        }}
                                                    >
                                                        {item.name}
                                                    </div>

                                                    <div className="small text-muted">
                                                        {item.quantity} × ₱
                                                        {Number(
                                                            item.price
                                                        ).toLocaleString()}
                                                    </div>

                                                    <div
                                                        className={
                                                            "small fw-semibold " +
                                                            (Number(item.available_stock) >= Number(item.quantity)
                                                                ? "text-success"
                                                                : "text-danger")
                                                        }
                                                    >
                                                        {Number(item.available_stock) > 0
                                                            ? `${Number(item.available_stock).toLocaleString()} available`
                                                            : "Out of stock"}
                                                    </div>
                                                </div>

                                                <div className="text-end">
                                                    <div className="fw-bold small">
                                                        ₱
                                                        {Number(
                                                            item.subtotal
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="rounded-3 p-3 mt-3"
                                    style={{ backgroundColor: "#f6f6f7" }}
                                >
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted small">
                                            Items
                                        </span>

                                        <span className="fw-semibold small">
                                            {totalQuantity}
                                        </span>
                                    </div>

                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted small">
                                            Subtotal
                                        </span>

                                        <span className="fw-semibold small">
                                            ₱{subtotal.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="d-flex justify-content-between mb-3">
                                        <span className="text-muted small">
                                            Shipping
                                        </span>

                                        <span className="fw-semibold small">
                                            {shippingFee === 0
                                                ? "FREE"
                                                : "₱" +
                                                  shippingFee.toLocaleString()}
                                        </span>
                                    </div>

                                    <hr className="my-2" />

                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">TOTAL</span>

                                        <span className="text-primary fw-bold fs-4">
                                            ₱{total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="rounded-3 p-3 mt-3"
                                    style={{
                                        backgroundColor: "#eef7ff",
                                    }}
                                >
                                    <div className="fw-bold small mb-2">
                                        <i className="bi bi-shield-check text-primary me-2"></i>
                                        SECURE CHECKOUT
                                    </div>

                                    <div className="small text-muted">
                                        Your order details are processed
                                        securely. Online payment protection will
                                        be enabled with the payment gateway.
                                    </div>
                                </div>

                                <Link
                                    href="/products"
                                    className="btn btn-outline-primary fw-bold w-100 mt-3"
                                >
                                    CONTINUE SHOPPING
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
