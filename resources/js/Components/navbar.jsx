import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function Navbar() {
    const { url, props } = usePage();

    const user = props.auth?.user;
    const isVerified = Boolean(user?.email_verified_at);
    const isLoggedIn = Boolean(user && isVerified);
    const isAdmin = isLoggedIn && user?.role === "admin";

    const [hoveredButton, setHoveredButton] = useState(null);

    const isActive = (path) => {
        return path === "/" ? url === "/" : url.startsWith(path);
    };

    const handleLogout = () => {
        router.post("/logout");
    };

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm p-3">
            <div className="container-fluid">

                {/* LOGO */}

                <Link
                    href="/"
                    className="navbar-brand fw-bold fs-4"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                >
                    SECUREVIEW
                </Link>

                {/* OFFCANVAS TOGGLER */}

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#navbarOffcanvas"
                    aria-controls="navbarOffcanvas"
                    aria-label="Open navigation menu"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* OFFCANVAS MENU */}

                <div
                    className="offcanvas offcanvas-end"
                    tabIndex={-1}
                    id="navbarOffcanvas"
                    aria-labelledby="navbarOffcanvasLabel"
                >
                    <div className="offcanvas-header">
                        <h5
                            className="offcanvas-title fw-bold"
                            id="navbarOffcanvasLabel"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            MENU
                        </h5>

                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>

                    {/* NAV LINKS */}

                    <div className="offcanvas-body">
                        <ul
                            className="navbar-nav ms-auto column-gap-lg-5"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                            <li className="nav-item">
                                <Link
                                    href="/"
                                    className={`nav-link ${
                                        isActive("/")
                                            ? "text-primary fw-bold border-bottom border-primary border-2"
                                            : "fw-medium"
                                    }`}
                                >
                                    HOME
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    href="/products"
                                    className={`nav-link ${
                                        isActive("/products")
                                            ? "text-primary fw-bold border-bottom border-primary border-2"
                                            : "fw-medium"
                                    }`}
                                >
                                    PRODUCTS
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    href="/packages"
                                    className={`nav-link ${
                                        isActive("/packages")
                                            ? "text-primary fw-bold border-bottom border-primary border-2"
                                            : "fw-medium"
                                    }`}
                                >
                                    PACKAGES
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    href="/about"
                                    className={`nav-link ${
                                        isActive("/about")
                                            ? "text-primary fw-bold border-bottom border-primary border-2"
                                            : "fw-medium"
                                    }`}
                                >
                                    ABOUT
                                </Link>
                            </li>
                        </ul>

                        {/* MOBILE AUTH */}

                        <div className="d-flex flex-column gap-2 mt-4 d-lg-none">

                            {!isLoggedIn ? (
                                <>
                                    <Link
                                        href="/login"
                                        className={`btn ${
                                            isActive("/login")
                                                ? "btn-outline-primary"
                                                : "btn-primary"
                                        } fw-bold w-100`}
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        LOGIN
                                    </Link>

                                    <Link
                                        href="/signup"
                                        className={`btn ${
                                            isActive("/signup")
                                                ? "btn-primary"
                                                : "btn-outline-primary"
                                        } fw-bold w-100`}
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        SIGN UP
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="text-center fw-semibold py-2"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        <i className="bi bi-person-circle me-2"></i>
                                        {user.name}
                                    </div>

                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            className="btn btn-outline-primary fw-bold w-100"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                            }}
                                        >
                                            ADMIN
                                        </Link>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold w-100"
                                        onClick={handleLogout}
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        SIGN OUT
                                    </button>
                                </>
                            )}

                        </div>
                    </div>
                </div>

                {/* DESKTOP DIVIDER */}

                <div className="vr mx-4 d-none d-lg-block"></div>

                {/* DESKTOP AUTH */}

                <div className="d-none d-lg-flex align-items-center gap-3">

                    {!isLoggedIn ? (
                        <>
                            <Link
                                href="/login"
                                onMouseEnter={() =>
                                    setHoveredButton("login")
                                }
                                onMouseLeave={() =>
                                    setHoveredButton(null)
                                }
                                className={`btn ${
                                    hoveredButton === "login"
                                        ? "btn-outline-primary"
                                        : "btn-primary"
                                } fw-bold`}
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    "--bs-btn-padding-x": "25px",
                                }}
                            >
                                LOGIN
                            </Link>

                            <Link
                                href="/signup"
                                onMouseEnter={() =>
                                    setHoveredButton("signup")
                                }
                                onMouseLeave={() =>
                                    setHoveredButton(null)
                                }
                                className={`btn ${
                                    hoveredButton === "signup"
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                } fw-bold`}
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    "--bs-btn-padding-x": "25px",
                                }}
                            >
                                SIGN UP
                            </Link>
                        </>
                    ) : (
                        <>
                            <div
                                className="d-flex align-items-center gap-2 fw-semibold"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                }}
                            >
                                <i className="bi bi-person-circle fs-5"></i>

                                <span>{user.name}</span>
                            </div>

                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    className="btn btn-outline-primary fw-bold"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                        "--bs-btn-padding-x": "20px",
                                    }}
                                >
                                    ADMIN
                                </Link>
                            )}

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="btn btn-primary fw-bold"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    "--bs-btn-padding-x": "20px",
                                }}
                            >
                                SIGN OUT
                            </button>
                        </>
                    )}

                </div>

            </div>
        </nav>
    );
}