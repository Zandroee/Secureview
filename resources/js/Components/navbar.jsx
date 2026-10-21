import { Link, router, usePage } from "@inertiajs/react";
import { Offcanvas } from "bootstrap";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
    const { url, props } = usePage();

    const user = props.auth?.user;

    const cartCount = props.cartCount ?? 0;
    const notificationCount = props.notificationCount ?? 0;
    const latestNotification = props.latestNotification ?? null;
    const notificationPopupsEnabled = user?.notification_popups_enabled !== false;

    const isAuthenticated = Boolean(user);
    const isVerified = Boolean(user?.email_verified_at);
    const isLoggedIn = isAuthenticated && isVerified;
    const isUnverified = isAuthenticated && !isVerified;
    const isAdmin = isLoggedIn && user?.role === "admin";
    const isTechnician = isLoggedIn && user?.role === "technician";

    const [hoveredButton, setHoveredButton] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [liveNotification, setLiveNotification] = useState(null);
    const [navigationSearch, setNavigationSearch] = useState("");
    const [showNavigationSearch, setShowNavigationSearch] = useState(false);

    const userMenuRef = useRef(null);
    const lastNotificationId = useRef(latestNotification?.id ?? null);

    const isActive = (path) => {
        return path === "/" ? url === "/" : url.startsWith(path);
    };

    const navigationItems = [
        { label: "Home", href: "/", keywords: "landing start main page" },
        { label: "Products", href: "/products", keywords: "shop cameras cctv hardware" },
        { label: "Packages", href: "/packages", keywords: "bundles sets deals" },
        { label: "Services", href: "/services", keywords: "installation repair maintenance service" },
        { label: "About", href: "/about", keywords: "company information contact" },
    ];

    if (isAuthenticated) {
        navigationItems.push(
            { label: "Account Settings", href: "/settings", keywords: "profile preferences password appearance dark mode" },
            { label: "Notifications", href: "/notifications", keywords: "alerts messages updates" }
        );
    }

    if (isLoggedIn && isAdmin) {
        navigationItems.push(
            { label: "Admin Dashboard", href: "/dashboard", keywords: "overview analytics metrics" },
            { label: "Admin Inquiries", href: "/admin/inquiries", keywords: "customer questions requests" },
            { label: "Admin Schedules", href: "/admin/schedules", keywords: "appointments calendar technician bookings" },
            { label: "Service History", href: "/admin/service-history", keywords: "completed jobs" },
            { label: "Manage Products", href: "/admin/products", keywords: "inventory stock cameras" },
            { label: "Manage Packages", href: "/admin/packages", keywords: "bundles" },
            { label: "Warranty", href: "/admin/warranty", keywords: "coverage claims" },
            { label: "Orders", href: "/admin/purchases", keywords: "purchases payments" },
            { label: "Users", href: "/admin/users", keywords: "accounts customers" },
            { label: "Transactions", href: "/admin/transactions", keywords: "payments financial records" },
            { label: "Activity Logs", href: "/admin/activity-logs", keywords: "audit history" },
            { label: "Invoice Settings", href: "/admin/invoice-settings", keywords: "billing" }
        );
    } else if (isLoggedIn && isTechnician) {
        navigationItems.push(
            { label: "Technician Workspace", href: "/technician/dashboard", keywords: "jobs assignments calendar" },
            { label: "My Schedules", href: "/schedules", keywords: "appointments" }
        );
    } else if (isLoggedIn) {
        navigationItems.push(
            { label: "My Schedules", href: "/schedules", keywords: "appointments bookings" },
            { label: "Inquiry History", href: "/inquiries", keywords: "requests service history" },
            { label: "Purchase History", href: "/purchases", keywords: "orders payments" },
            { label: "Warranty Claims", href: "/warranty-claims", keywords: "coverage repairs" },
            { label: "Cart", href: "/cart", keywords: "basket checkout" }
        );
    }

    const closeMobileNavigation = () => {
        const menu = document.getElementById("navbarOffcanvas");
        if (!menu?.classList.contains("show")) return;

        Offcanvas.getInstance(menu)?.hide();
    };

    const navigateToPage = (href) => {
        setShowNavigationSearch(false);
        setNavigationSearch("");
        closeMobileNavigation();
        router.visit(href);
    };

    const searchCatalog = (catalog) => {
        const query = navigationSearch.trim();
        if (!query) return;

        setShowNavigationSearch(false);
        setNavigationSearch("");
        closeMobileNavigation();
        router.get(catalog === "packages" ? "/packages" : "/products", { search: query }, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const matchingNavigationItems = navigationSearch.trim()
        ? navigationItems.filter((item) =>
            (item.label + " " + item.keywords)
                .toLowerCase()
                .includes(navigationSearch.trim().toLowerCase())
        ).slice(0, 5)
        : [];

    const handleNavigationSearchSubmit = (event) => {
        event.preventDefault();
        const query = navigationSearch.trim();
        if (!query) return;

        const normalizedQuery = query.toLowerCase();
        const exactMatch = navigationItems.find(
            (item) => item.label.toLowerCase() === normalizedQuery
        );
        const matches = navigationItems.filter(
            (item) => (item.label + " " + item.keywords).toLowerCase().includes(normalizedQuery)
        );

        if (exactMatch) {
            navigateToPage(exactMatch.href);
        } else if (matches.length === 1) {
            navigateToPage(matches[0].href);
        } else {
            searchCatalog("products");
        }
    };

    const renderNavigationSearch = () => (
        <form
            className="navbar-navigation-search"
            role="search"
            aria-label="SecureView navigation search"
            onSubmit={handleNavigationSearchSubmit}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setShowNavigationSearch(false);
                }
            }}
        >
            <div className="position-relative w-100">
                <div className="input-group input-group-sm">
                    <span className="input-group-text bg-body">
                        <i className="bi bi-search" aria-hidden="true"></i>
                    </span>
                    <input
                        type="search"
                        className="form-control"
                        placeholder="Search pages or products"
                        aria-label="Search pages or products"
                        aria-expanded={showNavigationSearch && Boolean(navigationSearch.trim())}
                        aria-controls="navbarNavigationSearchResults"
                        autoComplete="off"
                        value={navigationSearch}
                        onChange={(event) => {
                            setNavigationSearch(event.target.value);
                            setShowNavigationSearch(true);
                        }}
                        onFocus={() => setShowNavigationSearch(true)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setShowNavigationSearch(false);
                            }
                        }}
                    />
                </div>

                {showNavigationSearch && navigationSearch.trim() && (
                    <div
                        id="navbarNavigationSearchResults"
                        className="position-absolute top-100 start-0 mt-1 bg-body border rounded-3 shadow p-2"
                        style={{
                            width: "min(360px, calc(100vw - 2rem))",
                            maxHeight: "min(55vh, 420px)",
                            overflowY: "auto",
                            zIndex: 1080,
                        }}
                        role="listbox"
                        aria-label="Search suggestions"
                    >
                        {matchingNavigationItems.length > 0 ? (
                            <>
                                <div className="small fw-semibold text-muted px-2 pt-1 pb-2">
                                    Pages
                                </div>
                                {matchingNavigationItems.map((item) => (
                                    <button
                                        key={item.href}
                                        type="button"
                                        className="dropdown-item rounded-2 text-body"
                                        role="option"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => navigateToPage(item.href)}
                                    >
                                        <i className="bi bi-arrow-up-right me-2 text-primary" aria-hidden="true"></i>
                                        {item.label}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="small text-muted px-2 py-2">
                                No matching pages. Search the catalog below.
                            </div>
                        )}

                        <div className="border-top mt-2 pt-2">
                            <button
                                type="button"
                                className="dropdown-item rounded-2 text-body"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => searchCatalog("products")}
                            >
                                <i className="bi bi-camera-video me-2 text-primary" aria-hidden="true"></i>
                                Search products for “{navigationSearch.trim()}”
                            </button>
                            <button
                                type="button"
                                className="dropdown-item rounded-2 text-body"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => searchCatalog("packages")}
                            >
                                <i className="bi bi-box-seam me-2 text-primary" aria-hidden="true"></i>
                                Search packages for “{navigationSearch.trim()}”
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );

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
        setShowNavigationSearch(false);
    }, [url]);

    useEffect(() => {
        if (!isLoggedIn) return;

        const pollNotifications = () => {
            if (document.visibilityState !== "visible") return;

            const only = ["notificationCount", "latestNotification"];
            if (url.startsWith("/notifications")) only.push("notifications");

            router.reload({
                only,
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    const latest = page.props.latestNotification;
                    const latestId = latest?.id ? Number(latest.id) : null;
                    const previousId = lastNotificationId.current ? Number(lastNotificationId.current) : null;

                    if (latest && (!previousId || latestId > previousId)) {
                        lastNotificationId.current = latest.id;
                        if (notificationPopupsEnabled) {
                            setLiveNotification(latest);
                        }
                    }
                },
            });
        };

        const interval = window.setInterval(pollNotifications, 10000);
        return () => window.clearInterval(interval);
    }, [isLoggedIn, url, notificationPopupsEnabled]);

    useEffect(() => {
        if (!notificationPopupsEnabled) {
            setLiveNotification(null);
        }
    }, [notificationPopupsEnabled]);

    return (
        <>
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
                                 onClick={closeMobileNavigation}>
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
                                 onClick={closeMobileNavigation}>
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
                                 onClick={closeMobileNavigation}>
                                    PACKAGES
                                </Link>
                            </li>


                            <li className="nav-item">
                                <Link
                                    href="/services"
                                    className={
                                        "nav-link " +
                                        (isActive("/services")
                                            ? "text-primary fw-bold border-bottom border-primary border-2"
                                            : "fw-medium")
                                    }
                                 onClick={closeMobileNavigation}>
                                    SERVICES
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
                                 onClick={closeMobileNavigation}>
                                    ABOUT
                                </Link>
                            </li>
                        </ul>

                        {renderNavigationSearch()}

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
                                     data-bs-dismiss="offcanvas">
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
                                     data-bs-dismiss="offcanvas">
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
                                     data-bs-dismiss="offcanvas">
                                        VERIFY EMAIL
                                    </Link>

                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold w-100"
                                        onClick={handleLogout}
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                     data-bs-dismiss="offcanvas">
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
                                         data-bs-dismiss="offcanvas">
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
                                         data-bs-dismiss="offcanvas">
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

                                    {isAdmin && (
                                        <Link
                                            href="/dashboard"
                                            className="btn btn-primary fw-bold w-100"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                            }}
                                         data-bs-dismiss="offcanvas">
                                            ADMIN DASHBOARD
                                        </Link>
                                    )}

                                    {isTechnician && (
                                        <Link
                                            href="/technician/dashboard"
                                            className="btn btn-primary fw-bold w-100"
                                            style={{ fontFamily: "Outfit, sans-serif" }}
                                         data-bs-dismiss="offcanvas">
                                            TECHNICIAN WORKSPACE
                                        </Link>
                                    )}

                                    <Link
                                        href="/settings"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                     data-bs-dismiss="offcanvas">
                                        SETTINGS
                                    </Link>

                                    <Link
                                        href="/schedules"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                     data-bs-dismiss="offcanvas">
                                        SCHEDULES
                                    </Link>

                                    <Link
                                        href="/purchases"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                     data-bs-dismiss="offcanvas">
                                        PURCHASES
                                    </Link>
                                    <Link
                                        href="/inquiries"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                     data-bs-dismiss="offcanvas">
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
                                     data-bs-dismiss="offcanvas">
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
                                        {isAdmin && (
                                            <Link
                                                href="/dashboard"
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
                                                ADMIN DASHBOARD
                                            </Link>
                                        )}

                                        {isTechnician && (
                                            <Link
                                                href="/technician/dashboard"
                                                className="d-block text-dark text-decoration-none fw-semibold text-center"
                                                style={{ padding: "9px 12px", fontFamily: "Outfit, sans-serif", fontSize: "0.88rem" }}
                                            >
                                                TECHNICIAN WORKSPACE
                                            </Link>
                                        )}

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

        {liveNotification && (
            <div
                className="position-fixed top-0 end-0 m-3 bg-white border rounded-3 shadow-lg p-3"
                style={{ zIndex: 3000, width: "min(380px, calc(100vw - 2rem))" }}
                role="status"
                aria-live="polite"
            >
                <div className="d-flex align-items-start gap-3">
                    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-bell-fill"></i>
                    </div>
                    <div className="flex-grow-1">
                        <div className="fw-bold">{liveNotification.title}</div>
                        <div className="small text-muted mt-1">{liveNotification.message}</div>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary fw-semibold mt-3"
                            onClick={() => {
                                const notificationId = liveNotification.id;
                                setLiveNotification(null);
                                router.post("/notifications/" + notificationId + "/read");
                            }}
                        >
                            OPEN NOTIFICATION
                        </button>
                    </div>
                    <button type="button" className="btn-close" aria-label="Dismiss notification" onClick={() => setLiveNotification(null)} />
                </div>
            </div>
        )}
        </>
    );
}