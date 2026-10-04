import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
    const { url, props } = usePage();

    const user = props.auth?.user;

    const cartCount = props.cartCount ?? 0;
    const notificationCount = props.notificationCount ?? 0;

    const isAuthenticated = Boolean(user);
    const isVerified = Boolean(user?.email_verified_at);
    const isLoggedIn = isAuthenticated && isVerified;
    const isUnverified = isAuthenticated && !isVerified;
    const isAdmin = isLoggedIn && user?.role === "admin";

    const [hoveredButton, setHoveredButton] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const userMenuRef = useRef(null);

    const isActive = (path) => {
        return path === "/" ? url === "/" : url.startsWith(path);
    };

    const handleLogout = () => {
        setShowUserMenu(false);
        router.post("/logout");
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target)
            ) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setShowUserMenu(false);
    }, [url]);

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm p-3">
            <div className="container-fluid">

                {/* LOGO */}

                <Link
                    href="/"
                    className="navbar-brand fw-bold fs-4"
                    style={{
                        fontFamily: "Outfit, sans-serif",
                    }}
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
                            style={{
                                fontFamily: "Outfit, sans-serif",
                            }}
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
                            style={{
                                fontFamily: "Outfit, sans-serif",
                            }}
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

                            {!isAuthenticated ? (
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
                            ) : isUnverified ? (
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

                                    <div className="text-center text-warning small mb-1">
                                        Email not verified
                                    </div>

                                    <Link
                                        href="/email/verify"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        VERIFY EMAIL
                                    </Link>

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
                            ) : (
                                <>
                                    {/* USER INFO */}

                                    <div
                                        className="text-center fw-semibold py-2"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        <i className="bi bi-person-circle me-2"></i>
                                        {user.name}
                                    </div>


                                    {/* NOTIFICATIONS + CART */}

                                    <div className="d-flex justify-content-center gap-4 py-2">

                                        <Link
                                            href="/notifications"
                                            className="position-relative text-primary d-flex align-items-center justify-content-center text-decoration-none"
                                            style={{
                                                width: "42px",
                                                height: "42px",
                                                fontSize: "1.25rem",
                                            }}
                                            aria-label="Notifications"
                                        >
                                            <i className="bi bi-bell"></i>

                                            {notificationCount > 0 && (
                                                <span
                                                    className="position-absolute badge rounded-pill bg-danger"
                                                    style={{
                                                        top: "0px",
                                                        right: "0px",
                                                        fontSize: "0.65rem",
                                                        minWidth: "17px",
                                                        height: "17px",
                                                        padding: "2px 4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    {notificationCount > 99
                                                        ? "99+"
                                                        : notificationCount}
                                                </span>
                                            )}
                                        </Link>


                                        <Link
                                            href="/cart"
                                            className="position-relative text-primary d-flex align-items-center justify-content-center text-decoration-none"
                                            style={{
                                                width: "42px",
                                                height: "42px",
                                                fontSize: "1.25rem",
                                            }}
                                            aria-label="Cart"
                                        >
                                            <i className="bi bi-cart3"></i>

                                            {cartCount > 0 && (
                                                <span
                                                    className="position-absolute badge rounded-pill bg-danger"
                                                    style={{
                                                        top: "0px",
                                                        right: "0px",
                                                        fontSize: "0.65rem",
                                                        minWidth: "17px",
                                                        height: "17px",
                                                        padding: "2px 4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    {cartCount > 99 ? "99+" : cartCount}
                                                </span>
                                            )}
                                        </Link>

                                    </div>


                                    {/* USER OPTIONS */}

                                    <Link
                                        href="/settings"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        SETTINGS
                                    </Link>

                                    <Link
                                        href="/schedules"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        SCHEDULES
                                    </Link>

                                    <Link
                                        href="/purchases"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        PURCHASES
                                    </Link>
                                    <Link
                                        href="/inquiries"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                    >
                                        INQUIRIES
                                    </Link>


                                    {/* SIGN OUT */}

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

                <div
                    className="d-none d-lg-flex align-items-center gap-3"
                    style={{
                        position: "relative",
                    }}
                >

                    {!isAuthenticated ? (
                        <>
                            <Link
                                href="/login"
                                onMouseEnter={() => setHoveredButton("login")}
                                onMouseLeave={() => setHoveredButton(null)}
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
                                onMouseEnter={() => setHoveredButton("signup")}
                                onMouseLeave={() => setHoveredButton(null)}
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
                    ) : isUnverified ? (
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

                            <Link
                                href="/email/verify"
                                className="btn btn-outline-primary fw-bold"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    "--bs-btn-padding-x": "20px",
                                }}
                            >
                                VERIFY EMAIL
                            </Link>

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
                    ) : (
                        <>
                            {/* NOTIFICATIONS */}

                            <Link
                                href="/notifications"
                                className="position-relative text-primary d-flex align-items-center justify-content-center text-decoration-none"
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    transition: "all 0.2s ease",
                                }}
                                aria-label="Notifications"
                                title="Notifications"
                            >
                                <i
                                    className="bi bi-bell"
                                    style={{
                                        fontSize: "1.2rem",
                                    }}
                                ></i>

                                {notificationCount > 0 && (
                                    <span
                                        className="position-absolute translate-middle badge rounded-pill bg-danger"
                                        style={{
                                            top: "2px",
                                            right: "-2px",
                                            fontSize: "0.65rem",
                                            minWidth: "17px",
                                            height: "17px",
                                            padding: "2px 4px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {notificationCount > 99 ? "99+" : notificationCount}
                                    </span>
                                )}
                            </Link>


                            {/* CART */}

                            <Link
                                href="/cart"
                                className="position-relative text-primary d-flex align-items-center justify-content-center text-decoration-none"
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    transition: "all 0.2s ease",
                                }}
                                aria-label="Cart"
                                title="Cart"
                            >
                                <i
                                    className="bi bi-cart3"
                                    style={{
                                        fontSize: "1.2rem",
                                    }}
                                ></i>

                                {cartCount > 0 && (
                                    <span
                                        className="position-absolute translate-middle badge rounded-pill bg-danger"
                                        style={{
                                            top: "2px",
                                            right: "-2px",
                                            fontSize: "0.65rem",
                                            minWidth: "17px",
                                            height: "17px",
                                            padding: "2px 4px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>


                            {/* USER */}

                            <div
                                ref={userMenuRef}
                                style={{
                                    position: "relative",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowUserMenu((previous) => !previous)
                                    }
                                    className="border-0 d-flex align-items-center justify-content-center"
                                    style={{
                                        width: "38px",
                                        height: "38px",
                                        padding: 0,
                                        borderRadius: "50%",
                                        backgroundColor: "#dee2e6",
                                        color: "#ffffff",
                                        cursor: "pointer",
                                        boxShadow: showUserMenu
                                            ? "0 0 0 3px rgba(13, 110, 253, 0.15)"
                                            : "none",
                                        transition: "all 0.2s ease",
                                    }}
                                    aria-label="User menu"
                                    aria-expanded={showUserMenu}
                                >
                                    <i
                                        className="bi bi-person-fill"
                                        style={{
                                            fontSize: "1.25rem",
                                        }}
                                    ></i>
                                </button>

                                {showUserMenu && (
                                    <div
                                        className="bg-white border rounded-3 shadow-sm"
                                        style={{
                                            position: "absolute",
                                            top: "calc(100% + 10px)",
                                            right: "-50px",
                                            width: "165px",
                                            padding: "7px 0",
                                            zIndex: 1050,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Link
                                            href="/settings"
                                            className="d-block text-dark text-decoration-none fw-semibold text-center"
                                            style={{
                                                padding: "9px 12px",
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "0.88rem",
                                                transition: "background-color 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f8f9fa";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            SETTINGS
                                        </Link>

                                        <Link
                                            href="/schedules"
                                            className="d-block text-dark text-decoration-none fw-semibold text-center"
                                            style={{
                                                padding: "9px 12px",
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "0.88rem",
                                                transition: "background-color 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f8f9fa";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            SCHEDULES
                                        </Link>

                                        <Link
                                            href="/purchases"
                                            className="d-block text-dark text-decoration-none fw-semibold text-center"
                                            style={{
                                                padding: "9px 12px",
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "0.88rem",
                                                transition: "background-color 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f8f9fa";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            PURCHASES
                                        </Link>
                                        <Link
                                            href="/inquiries"
                                            className="d-block text-dark text-decoration-none fw-semibold text-center"
                                            style={{
                                                padding: "9px 12px",
                                                fontFamily: "Outfit, sans-serif",
                                                fontSize: "0.88rem",
                                                transition: "background-color 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f8f9fa";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            INQUIRIES
                                        </Link>
                                    </div>
                                )}
                            </div>


                            {/* SIGN OUT */}

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="btn btn-outline-primary fw-bold"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    "--bs-btn-padding-x": "18px",
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