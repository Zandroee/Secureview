import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link, useForm } from "@inertiajs/react";

const paymentMethods = [
    {
        id: "cash",
        title: "Cash on Delivery",
        subtitle: "Pay when your order arrives.",
        icon: "bi bi-cash-stack",
    },
    {
        id: "gcash",
        title: "GCash",
        subtitle: "Pay securely using GCash.",
        icon: "bi bi-phone",
    },
    {
        id: "card",
        title: "Credit / Debit Card",
        subtitle: "Visa, Mastercard, and supported cards.",
        icon: "bi bi-credit-card",
    },
    {
        id: "maya",
        title: "Maya",
        subtitle: "Pay using your Maya account.",
        icon: "bi bi-wallet2",
    },
];

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
                    : "Cash on Delivery";

        return (
            <div>
                <Navbar />

                <main className="container py-5">
                    <div
                        className="border rounded-3 p-5 text-center mx-auto"
                        style={{ maxWidth: "720px" }}
                    >
                        <i
                            className="bi bi-check-circle-fill text-success"
                            style={{ fontSize: "4rem" }}
                        ></i>

                        <h1
                            className="fw-bold mt-4 mb-2"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            ORDER PLACED
                        </h1>

                        <p className="text-muted mb-4">
                            Your order <strong>{orderNumber}</strong> has been
                            created successfully.
                        </p>

                        <div className="bg-light rounded-3 p-4 mb-4 text-start">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">
                                    Payment Method
                                </span>

                                <span className="fw-semibold">
                                    {paymentLabel}
                                </span>
                            </div>

                            <div className="d-flex justify-content-between">
                                <span className="text-muted">
                                    Payment Status
                                </span>

                                <span className="fw-semibold">
                                    {paymentMethod === "cash"
                                        ? "Pending — pay on delivery"
                                        : "Awaiting payment"}
                                </span>
                            </div>
                        </div>

                        <p className="small text-muted mb-4">
                            Online payment processing for GCash, Card, and Maya
                            will be connected to the payment gateway in the
                            next step.
                        </p>

                        <Link
                            href="/products"
                            className="btn btn-primary fw-bold px-4"
                        >
                            CONTINUE SHOPPING
                        </Link>
                    </div>
                </main>

                <Footer />
            </div>
        );
    }

    return (
        <div>
            <Navbar />

            <main className="container py-5">
                <div className="mb-4">
                    <h1
                        className="fw-bold mb-1"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                        CHECKOUT
                    </h1>

                    <p className="text-muted mb-0">
                        Enter your delivery details and choose your payment
                        method.
                    </p>
                </div>

                {errors.cart && (
                    <div className="alert alert-danger">{errors.cart}</div>
                )}

                <form onSubmit={submit}>
                    <div className="row g-4">
                        <div className="col-lg-7">
                            <div className="border rounded-3 p-4 mb-4">
                                <h4
                                    className="fw-bold mb-4"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                    DELIVERY INFORMATION
                                </h4>

                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label fw-semibold">
                                            Full Name
                                        </label>

                                        <input
                                            type="text"
                                            className={`form-control ${errors.customer_name ? "is-invalid" : ""}`}
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
                                        <label className="form-label fw-semibold">
                                            Phone Number
                                        </label>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="11"
                                            className={`form-control ${errors.customer_phone ? "is-invalid" : ""}`}
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

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Email
                                        </label>

                                        <input
                                            type="email"
                                            className={`form-control ${errors.customer_email ? "is-invalid" : ""}`}
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

                                    <div className="col-12">
                                        <label className="form-label fw-semibold">
                                            Delivery Address
                                        </label>

                                        <textarea
                                            rows="4"
                                            className={`form-control ${errors.delivery_address ? "is-invalid" : ""}`}
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

                                    <div className="col-12">
                                        <label className="form-label fw-semibold">
                                            Order Notes{" "}
                                            <span className="text-muted fw-normal">
                                                (optional)
                                            </span>
                                        </label>

                                        <textarea
                                            rows="3"
                                            className={`form-control ${errors.notes ? "is-invalid" : ""}`}
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
                                </div>
                            </div>

                            <div className="border rounded-3 p-4">
                                <h4
                                    className="fw-bold mb-4"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                    PAYMENT METHOD
                                </h4>

                                <div className="d-flex flex-column gap-3">
                                    {paymentMethods.map((method) => {
                                        const selected =
                                            data.payment_method === method.id;

                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                className={`btn text-start border rounded-3 p-3 ${
                                                    selected
                                                        ? "border-primary bg-primary-subtle"
                                                        : "bg-white"
                                                }`}
                                                onClick={() =>
                                                    setData(
                                                        "payment_method",
                                                        method.id
                                                    )
                                                }
                                            >
                                                <div className="d-flex align-items-center gap-3">
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                                                        style={{
                                                            width: "48px",
                                                            height: "48px",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <i
                                                            className={method.icon}
                                                            style={{
                                                                fontSize: "1.25rem",
                                                            }}
                                                        ></i>
                                                    </div>

                                                    <div className="flex-grow-1">
                                                        <div className="fw-bold">
                                                            {method.title}
                                                        </div>

                                                        <div className="small text-muted">
                                                            {method.subtitle}
                                                        </div>
                                                    </div>

                                                    <i
                                                        className={
                                                            selected
                                                                ? "bi bi-check-circle-fill text-primary"
                                                                : "bi bi-circle text-muted"
                                                        }
                                                        style={{
                                                            fontSize: "1.25rem",
                                                        }}
                                                    ></i>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {data.payment_method !== "cash" && (
                                    <div className="alert alert-info mt-3 mb-0">
                                        Online payment will open through the
                                        secure payment gateway once the
                                        payment integration is connected.
                                    </div>
                                )}

                                {errors.payment_method && (
                                    <div className="text-danger small mt-2">
                                        {errors.payment_method}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div
                                className="border rounded-3 p-4 sticky-lg-top"
                                style={{ top: "20px" }}
                            >
                                <h4
                                    className="fw-bold mb-4"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                    ORDER SUMMARY
                                </h4>

                                <div className="d-flex flex-column gap-3 mb-4">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="d-flex gap-3"
                                        >
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="rounded"
                                                    style={{
                                                        width: "64px",
                                                        height: "64px",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="bg-secondary-subtle rounded d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: "64px",
                                                        height: "64px",
                                                    }}
                                                >
                                                    <i className="bi bi-camera-video text-secondary"></i>
                                                </div>
                                            )}

                                            <div className="flex-grow-1">
                                                <div className="fw-semibold">
                                                    {item.name}
                                                </div>

                                                <div className="small text-muted">
                                                    {item.quantity} × ₱
                                                    {Number(
                                                        item.price
                                                    ).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="fw-bold">
                                                ₱
                                                {Number(
                                                    item.subtotal
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Subtotal
                                    </span>

                                    <span className="fw-semibold">
                                        ₱{subtotal.toLocaleString()}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">
                                        Shipping
                                    </span>

                                    <span className="fw-semibold">
                                        {shippingFee === 0
                                            ? "FREE"
                                            : "₱" +
                                              shippingFee.toLocaleString()}
                                    </span>
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <span className="fw-bold">TOTAL</span>

                                    <span className="text-primary fw-bold fs-4">
                                        ₱{total.toLocaleString()}
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary fw-bold w-100"
                                    disabled={processing}
                                >
                                    {processing
                                        ? "PROCESSING..."
                                        : data.payment_method === "cash"
                                          ? "PLACE ORDER"
                                          : "CONTINUE"}
                                </button>

                                <Link
                                    href="/cart"
                                    className="btn btn-outline-primary fw-bold w-100 mt-2"
                                >
                                    BACK TO CART
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            <Footer />
        </div>
    );
}
