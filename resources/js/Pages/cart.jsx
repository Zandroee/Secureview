import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link, router } from "@inertiajs/react";

export default function Cart({ cart }) {
    const items = cart?.items ?? [];

    const subtotal = items.reduce(
        (total, item) => total + Number(item.price) * Number(item.quantity),
        0
    );

    const updateQuantity = (item, quantity) => {
        router.patch(
            `/cart/items/${item.id}`,
            {
                quantity,
            },
            {
                preserveScroll: true,
            }
        );
    };

    const removeItem = (item) => {
        router.delete(`/cart/items/${item.id}`, {
            preserveScroll: true,
        });
    };

    const clearCart = () => {
        router.delete("/cart", {
            preserveScroll: true,
        });
    };

    return (
        <div>
            <Navbar />

            <main className="container py-5">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                    <div>
                        <h1
                            className="fw-bold mb-1"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            YOUR CART
                        </h1>

                        <p
                            className="text-muted mb-0"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            Review the products and packages you want to purchase.
                        </p>
                    </div>

                    {items.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-outline-danger fw-bold"
                            onClick={clearCart}
                        >
                            CLEAR CART
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="border rounded-3 p-5 text-center">
                        <i
                            className="bi bi-cart3 text-muted"
                            style={{ fontSize: "4rem" }}
                        ></i>

                        <h3
                            className="fw-bold mt-3"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            Your cart is empty
                        </h3>

                        <p className="text-muted mb-4">
                            Add products or packages to your cart to get started.
                        </p>

                        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                            <Link
                                href="/products"
                                className="btn btn-primary fw-bold"
                            >
                                BROWSE PRODUCTS
                            </Link>

                            <Link
                                href="/packages"
                                className="btn btn-outline-primary fw-bold"
                            >
                                BROWSE PACKAGES
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="row g-4">
                        <div className="col-lg-8">
                            <div className="border rounded-3 overflow-hidden">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 border-bottom"
                                    >
                                        <div className="row align-items-center g-3">
                                            <div className="col-4 col-md-2">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-100 rounded"
                                                        style={{
                                                            height: "90px",
                                                            objectFit: "cover",
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="bg-secondary-subtle rounded d-flex align-items-center justify-content-center"
                                                        style={{
                                                            height: "90px",
                                                        }}
                                                    >
                                                        <i
                                                            className={
                                                                item.type ===
                                                                "package"
                                                                    ? "bi bi-box-seam text-secondary"
                                                                    : "bi bi-camera-video text-secondary"
                                                            }
                                                            style={{
                                                                fontSize: "2rem",
                                                            }}
                                                        ></i>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-8 col-md-5">
                                                <div
                                                    className="text-primary text-uppercase small fw-semibold mb-1"
                                                    style={{
                                                        fontFamily:
                                                            "Outfit, sans-serif",
                                                    }}
                                                >
                                                    {item.type}
                                                </div>

                                                <h5
                                                    className="fw-bold mb-1"
                                                    style={{
                                                        fontFamily:
                                                            "Outfit, sans-serif",
                                                    }}
                                                >
                                                    {item.name}
                                                </h5>

                                                <div className="text-muted">
                                                    ₱
                                                    {Number(
                                                        item.price
                                                    ).toLocaleString()}
                                                    {" "}each
                                                </div>
                                            </div>

                                            <div className="col-6 col-md-3">
                                                <div
                                                    className="d-flex align-items-center justify-content-center gap-2"
                                                    style={{
                                                        fontFamily:
                                                            "Outfit, sans-serif",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: "32px",
                                                            height: "32px",
                                                        }}
                                                        onClick={() => {
                                                            if (
                                                                item.quantity >
                                                                1
                                                            ) {
                                                                updateQuantity(
                                                                    item,
                                                                    item.quantity -
                                                                        1
                                                                );
                                                            }
                                                        }}
                                                        disabled={
                                                            item.quantity <= 1
                                                        }
                                                    >
                                                        −
                                                    </button>

                                                    <span
                                                        className="fw-bold text-center"
                                                        style={{
                                                            minWidth: "28px",
                                                        }}
                                                    >
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: "32px",
                                                            height: "32px",
                                                        }}
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item,
                                                                Math.min(
                                                                    99,
                                                                    item.quantity +
                                                                        1
                                                                )
                                                            )
                                                        }
                                                        disabled={
                                                            item.quantity >=
                                                            99
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="col-6 col-md-2 text-md-end">
                                                <div className="fw-bold text-primary mb-2">
                                                    ₱
                                                    {(
                                                        Number(item.price) *
                                                        Number(item.quantity)
                                                    ).toLocaleString()}
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                                                    onClick={() =>
                                                        removeItem(item)
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div className="border rounded-3 p-4 sticky-lg-top" style={{ top: "20px" }}>
                                <h4
                                    className="fw-bold mb-4"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    ORDER SUMMARY
                                </h4>

                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">
                                        Items
                                    </span>

                                    <span className="fw-semibold">
                                        {items.reduce(
                                            (total, item) =>
                                                total +
                                                Number(item.quantity),
                                            0
                                        )}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="text-muted">
                                        Subtotal
                                    </span>

                                    <span className="fw-bold">
                                        ₱{subtotal.toLocaleString()}
                                    </span>
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <span className="fw-bold">
                                        TOTAL
                                    </span>

                                    <span className="text-primary fw-bold fs-4">
                                        ₱{subtotal.toLocaleString()}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary fw-bold w-100 mb-2"
                                    disabled
                                    title="Checkout will be built next."
                                >
                                    PROCEED TO CHECKOUT
                                </button>

                                <Link
                                    href="/products"
                                    className="btn btn-outline-primary fw-bold w-100"
                                >
                                    CONTINUE SHOPPING
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
