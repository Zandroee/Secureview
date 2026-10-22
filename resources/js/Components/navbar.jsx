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
    const [catalogSuggestions, setCatalogSuggestions] = useState({ products: [], packages: [] });
    const [catalogSearchLoading, setCatalogSearchLoading] = useState(false);
    const [catalogSearchError, setCatalogSearchError] = useState(false);

    const userMenuRef = useRef(null);
    const lastNotificationId = useRef(latestNotification?.id ?? null);

    const isActive = (path) => {
        return path === "/" ? url === "/" : url.startsWith(path);
    };

    const navigationItems = [
        { label: "Home", href: "/", icon: "bi-house", keywords: "landing start main homepage" },
        { label: "Products", href: "/products", icon: "bi-camera-video", keywords: "shop cctv camera cameras hardware devices recorders" },
        { label: "Packages", href: "/packages", icon: "bi-box-seam", keywords: "bundles sets deals kits package system" },
        { label: "Services", href: "/services", icon: "bi-tools", keywords: "installation repair maintenance service technical support" },
        { label: "About", href: "/about", icon: "bi-info-circle", keywords: "company information contact netmax trading" },
    ];

    if (!isAuthenticated) {
        navigationItems.push(
            { label: "Log In", href: "/login", icon: "bi-box-arrow-in-right", keywords: "sign in account access" },
            { label: "Create Account", href: "/signup", icon: "bi-person-plus", keywords: "register sign up new customer" }
        );
    }

    if (isAuthenticated) {
        navigationItems.push(
            { label: "Account Settings", href: "/settings", icon: "bi-gear", keywords: "profile preferences password appearance theme dark mode notifications security" },
            { label: "Notifications", href: "/notifications", icon: "bi-bell", keywords: "alerts messages updates unread" }
        );
    }

    if (isLoggedIn && isAdmin) {
        navigationItems.push(
            { label: "Admin Dashboard", href: "/dashboard", icon: "bi-speedometer2", keywords: "overview analytics metrics revenue orders stock" },
            { label: "Manage Inquiries", href: "/admin/inquiries", icon: "bi-chat-left-text", keywords: "customer questions requests pending inquiry" },
            { label: "Manage Schedules", href: "/admin/schedules", icon: "bi-calendar3", keywords: "appointments calendar technician bookings availability" },
            { label: "Service History", href: "/admin/service-history", icon: "bi-clock-history", keywords: "completed jobs archived services" },
            { label: "Manage Products", href: "/admin/products", icon: "bi-camera-video", keywords: "inventory stock cameras catalogue" },
            { label: "Inventory Adjustments", href: "/admin/inventory-adjustments", icon: "bi-boxes", keywords: "stock changes adjustment reasons audit inventory" },
            { label: "Manage Packages", href: "/admin/packages", icon: "bi-box-seam", keywords: "bundles package catalogue" },
            { label: "Warranty Management", href: "/admin/warranty", icon: "bi-shield-check", keywords: "coverage claims warranty" },
            { label: "Order Management", href: "/admin/purchases", icon: "bi-bag-check", keywords: "orders purchases payments pending" },
            { label: "User Management", href: "/admin/users", icon: "bi-people", keywords: "accounts customers technicians roles" },
            { label: "Transaction Records", href: "/admin/transactions", icon: "bi-receipt", keywords: "payments financial records transactions" },
            { label: "Activity Logs", href: "/admin/activity-logs", icon: "bi-journal-text", keywords: "audit history events activities" },
            { label: "Invoice Settings", href: "/admin/invoice-settings", icon: "bi-file-earmark-text", keywords: "billing invoice serial numbers" }
        );
    } else if (isLoggedIn && isTechnician) {
        navigationItems.push(
            { label: "Technician Workspace", href: "/technician/dashboard", icon: "bi-tools", keywords: "jobs assignments work field operations" },
            { label: "My Service Jobs", href: "/technician/dashboard#my-jobs", icon: "bi-clipboard-check", keywords: "assigned ongoing upcoming completed jobs" },
            { label: "Available Team Jobs", href: "/technician/dashboard#available-jobs", icon: "bi-people", keywords: "join team jobs available services" },
            { label: "Inventory", href: "/technician/dashboard#inventory", icon: "bi-boxes", keywords: "stock products quantity adjustment" },
            { label: "My Schedules", href: "/schedules", icon: "bi-calendar3", keywords: "appointments" },
            { label: "Purchase History", href: "/purchases", icon: "bi-bag-check", keywords: "orders" }
        );
    } else if (isLoggedIn) {
        navigationItems.push(
            { label: "My Schedules", href: "/schedules", icon: "bi-calendar3", keywords: "appointments bookings upcoming service" },
            { label: "Inquiry History", href: "/inquiries", icon: "bi-chat-left-text", keywords: "requests status service inquiry" },
            { label: "Purchase History", href: "/purchases", icon: "bi-bag-check", keywords: "orders payments receipts" },
            { label: "Warranty Claims", href: "/warranty-claims", icon: "bi-shield-check", keywords: "coverage repair defective warranty" },
            { label: "Shopping Cart", href: "/cart", icon: "bi-cart3", keywords: "basket checkout buy" }
        );
    }

    const getMobileNavigationMenu = () => document.getElementById("navbarOffcanvas");

    const getMobileNavigationInstance = (menu = getMobileNavigationMenu()) => {
        if (!menu) return null;

        return Offcanvas.getOrCreateInstance(menu, {
            backdrop: true,
            keyboard: true,
            scroll: false,
        });
    };

    const closeMobileNavigation = () => {
        const menu = getMobileNavigationMenu();
        if (!menu?.classList.contains("show")) return;

        getMobileNavigationInstance(menu)?.hide();
    };

    // Wait for Bootstrap to finish hiding the menu before navigating away.
    // Inertia must not unmount the offcanvas before Bootstrap removes its backdrop
    // and restores document scrolling.
    const runAfterMobileNavigationCloses = (action) => {
        const menu = getMobileNavigationMenu();

        if (!menu?.classList.contains("show")) {
            action();
            return;
        }

        let completed = false;
        let fallbackTimer;

        const finish = () => {
            if (completed) return;
            completed = true;
            window.clearTimeout(fallbackTimer);
            menu.removeEventListener("hidden.bs.offcanvas", finish);

            window.requestAnimationFrame(() => {
                const anotherOffcanvasIsOpen = Array.from(
                    document.querySelectorAll(".offcanvas")
                ).some((element) => element !== menu && element.classList.contains("show"));
                const modalIsOpen = Boolean(document.querySelector(".modal.show"));

                if (!menu.classList.contains("show") && !anotherOffcanvasIsOpen && !modalIsOpen) {
                    document.querySelectorAll(".offcanvas-backdrop").forEach((backdrop) => backdrop.remove());
                    document.body.style.removeProperty("overflow");
                    document.body.style.removeProperty("padding-right");
                }

                action();
            });
        };

        menu.addEventListener("hidden.bs.offcanvas", finish, { once: true });
        getMobileNavigationInstance(menu)?.hide();
        fallbackTimer = window.setTimeout(finish, 600);
    };

    const handleMobileOffcanvasLinkClick = (event) => {
        const menu = getMobileNavigationMenu();
        const isMobileViewport = window.matchMedia("(max-width: 991.98px)").matches;

        // Keep desktop links on Inertia, but use a full navigation from the
        // mobile drawer so Bootstrap can never leave a stale body scroll lock.
        if (!isMobileViewport) return;

        const href = event.currentTarget.getAttribute("href");
        if (!href) return;

        event.preventDefault();
        setShowNavigationSearch(false);
        setNavigationSearch("");

        const navigate = () => window.location.assign(href);
        if (menu?.classList.contains("show")) {
            runAfterMobileNavigationCloses(navigate);
        } else {
            navigate();
        }
    };

    const openMobileNavigation = () => {
        getMobileNavigationInstance()?.show();
    };

    const navigateToPage = (href) => {
        setShowNavigationSearch(false);
        setNavigationSearch("");

        const menu = getMobileNavigationMenu();
        if (window.matchMedia("(max-width: 991.98px)").matches && menu?.classList.contains("show")) {
            runAfterMobileNavigationCloses(() => window.location.assign(href));
            return;
        }

        router.visit(href);
    };

    const matchingNavigationItems = navigationSearch.trim()
        ? navigationItems.filter((item) =>
            (item.label + " " + item.keywords)
                .toLowerCase()
                .includes(navigationSearch.trim().toLowerCase())
        )
        : [];

    const normalizedCatalogSuggestions = {
        products: catalogSuggestions.products ?? [],
        packages: catalogSuggestions.packages ?? [],
    };

    const hasCatalogResults =
        normalizedCatalogSuggestions.products.length > 0 ||
        normalizedCatalogSuggestions.packages.length > 0;

    const formatSearchPrice = (price) =>
        Number(price ?? 0).toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 0,
        });

    const catalogImageUrl = (item) => {
        const image = item?.image;
        if (!image) return "";
        if (/^https?:\/\//i.test(image) || String(image).startsWith("/")) return image;
        return "/storage/" + String(image).replace(/^\/+/, "");
    };

    const searchCatalog = (catalog) => {
        const query = navigationSearch.trim();
        if (!query) return;

        setShowNavigationSearch(false);
        setNavigationSearch("");
        runAfterMobileNavigationCloses(() => {
            router.get(catalog === "packages" ? "/packages" : "/products", { search: query }, {
                preserveState: false,
                preserveScroll: false,
            });
        });
    };

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
        } else if (matches.length > 1) {
            // Keep ambiguous page searches open so the user can choose the correct destination.
            setShowNavigationSearch(true);
        } else if (
            normalizedCatalogSuggestions.packages.length > 0 &&
            normalizedCatalogSuggestions.products.length === 0
        ) {
            searchCatalog("packages");
        } else {
            searchCatalog("products");
        }
    };

    const renderNavigationSearch = () => (
        <form
            className="navbar-navigation-search"
            role="search"
            aria-label="SecureView search"
            onSubmit={handleNavigationSearchSubmit}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setShowNavigationSearch(false);
                }
            }}
        >
            <div className="position-relative w-100">
                <input
                    type="search"
                    className="form-control navbar-navigation-search-input"
                    placeholder="SEARCH"
                    aria-label="Search pages, products, and packages"
                    aria-expanded={showNavigationSearch}
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
                <i
                    className="bi bi-search navbar-navigation-search-icon"
                    aria-hidden="true"
                />

                {showNavigationSearch && (
                    <div
                        id="navbarNavigationSearchResults"
                        className="navbar-search-dropdown bg-body border shadow-lg"
                        aria-label="Search suggestions"
                    >
                        {!navigationSearch.trim() ? (
                            <>
                                <div className="navbar-search-section-heading">
                                    QUICK LINKS
                                </div>
                                <div className="navbar-search-results-list">
                                    {navigationItems.map((item) => (
                                        <button
                                            key={item.href}
                                            type="button"
                                            className="navbar-search-result"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => navigateToPage(item.href)}
                                        >
                                            <span className="navbar-search-result-icon">
                                                <i className={"bi " + item.icon} aria-hidden="true" />
                                            </span>
                                            <span className="navbar-search-result-copy">
                                                <span className="navbar-search-result-title">{item.label}</span>
                                                <span className="navbar-search-result-subtitle">{item.href}</span>
                                            </span>
                                            <i className="bi bi-arrow-up-right navbar-search-result-arrow" aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                                <div className="navbar-search-hint">
                                    Type at least 2 characters to search the catalog.
                                </div>
                            </>
                        ) : (
                            <>
                                {matchingNavigationItems.length > 0 && (
                                    <section className="navbar-search-section">
                                        <div className="navbar-search-section-heading">
                                            PAGES <span>{matchingNavigationItems.length}</span>
                                        </div>
                                        <div className="navbar-search-results-list">
                                            {matchingNavigationItems.map((item) => (
                                                <button
                                                    key={item.href}
                                                    type="button"
                                                    className="navbar-search-result"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => navigateToPage(item.href)}
                                                >
                                                    <span className="navbar-search-result-icon">
                                                        <i className={"bi " + item.icon} aria-hidden="true" />
                                                    </span>
                                                    <span className="navbar-search-result-copy">
                                                        <span className="navbar-search-result-title">{item.label}</span>
                                                        <span className="navbar-search-result-subtitle">{item.href}</span>
                                                    </span>
                                                    <i className="bi bi-arrow-up-right navbar-search-result-arrow" aria-hidden="true" />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {navigationSearch.trim().length < 2 ? (
                                    <div className="navbar-search-hint">
                                        Keep typing to search matching products and packages.
                                    </div>
                                ) : catalogSearchError ? (
                                    <div className="navbar-search-state">
                                        Catalog suggestions are temporarily unavailable. You can still open the full search results below.
                                    </div>
                                ) : catalogSearchLoading ? (
                                    <div className="navbar-search-state">
                                        <span className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true" />
                                        Searching products and packages…
                                    </div>
                                ) : (
                                    <>
                                        {normalizedCatalogSuggestions.products.length > 0 && (
                                            <section className="navbar-search-section">
                                                <div className="navbar-search-section-heading">
                                                    PRODUCTS <span>{normalizedCatalogSuggestions.products.length}</span>
                                                </div>
                                                <div className="navbar-search-results-list">
                                                    {normalizedCatalogSuggestions.products.map((item) => (
                                                        <button
                                                            key={"product-" + item.id}
                                                            type="button"
                                                            className="navbar-search-catalog-result"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => navigateToPage(item.href)}
                                                        >
                                                            {catalogImageUrl(item) ? (
                                                                <img src={catalogImageUrl(item)} alt="" className="navbar-search-thumbnail" loading="lazy" />
                                                            ) : (
                                                                <span className="navbar-search-thumbnail navbar-search-thumbnail-placeholder"><i className="bi bi-camera-video" aria-hidden="true" /></span>
                                                            )}
                                                            <span className="navbar-search-result-copy">
                                                                <span className="navbar-search-result-title">{item.name}</span>
                                                                <span className="navbar-search-result-subtitle">{item.category || "CCTV product"}</span>
                                                            </span>
                                                            <span className="navbar-search-price">{formatSearchPrice(item.price)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button type="button" className="navbar-search-view-all" onMouseDown={(event) => event.preventDefault()} onClick={() => searchCatalog("products")}>
                                                    View all matching products <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                                                </button>
                                            </section>
                                        )}

                                        {normalizedCatalogSuggestions.packages.length > 0 && (
                                            <section className="navbar-search-section">
                                                <div className="navbar-search-section-heading">
                                                    PACKAGES <span>{normalizedCatalogSuggestions.packages.length}</span>
                                                </div>
                                                <div className="navbar-search-results-list">
                                                    {normalizedCatalogSuggestions.packages.map((item) => (
                                                        <button
                                                            key={"package-" + item.id}
                                                            type="button"
                                                            className="navbar-search-catalog-result"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => navigateToPage(item.href)}
                                                        >
                                                            {catalogImageUrl(item) ? (
                                                                <img src={catalogImageUrl(item)} alt="" className="navbar-search-thumbnail" loading="lazy" />
                                                            ) : (
                                                                <span className="navbar-search-thumbnail navbar-search-thumbnail-placeholder"><i className="bi bi-box-seam" aria-hidden="true" /></span>
                                                            )}
                                                            <span className="navbar-search-result-copy">
                                                                <span className="navbar-search-result-title">{item.name}</span>
                                                                <span className="navbar-search-result-subtitle">{item.category || "CCTV package"}</span>
                                                            </span>
                                                            <span className="navbar-search-price">{formatSearchPrice(item.price)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button type="button" className="navbar-search-view-all" onMouseDown={(event) => event.preventDefault()} onClick={() => searchCatalog("packages")}>
                                                    View all matching packages <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                                                </button>
                                            </section>
                                        )}

                                        {!hasCatalogResults && matchingNavigationItems.length === 0 && (
                                            <div className="navbar-search-empty">
                                                <i className="bi bi-search fs-4 text-secondary mb-2" aria-hidden="true" />
                                                <strong>No exact matches found</strong>
                                                <span>Search all products or packages using this phrase.</span>
                                            </div>
                                        )}

                                        <div className="navbar-search-footer">
                                            <button type="button" className="navbar-search-footer-action" onMouseDown={(event) => event.preventDefault()} onClick={() => searchCatalog("products")}>
                                                Search products for “{navigationSearch.trim()}”
                                            </button>
                                            <button type="button" className="navbar-search-footer-action" onMouseDown={(event) => event.preventDefault()} onClick={() => searchCatalog("packages")}>
                                                Search packages for “{navigationSearch.trim()}”
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </form>
    ); 

    const handleLogout = () => {
        setShowUserMenu(false);
        runAfterMobileNavigationCloses(() => router.post("/logout"));
    };

    useEffect(() => {
        const menu = document.getElementById("navbarOffcanvas");
        if (!menu) return undefined;

        const cleanupOrphanedBackdrop = () => {
            window.requestAnimationFrame(() => {
                const anotherOffcanvasIsOpen = Array.from(
                    document.querySelectorAll(".offcanvas")
                ).some((element) => element !== menu && element.classList.contains("show"));
                const modalIsOpen = Boolean(document.querySelector(".modal.show"));

                if (menu.classList.contains("show") || anotherOffcanvasIsOpen || modalIsOpen) {
                    return;
                }

                document.querySelectorAll(".offcanvas-backdrop").forEach((backdrop) => {
                    backdrop.remove();
                });
                document.body.classList.remove("offcanvas-open");
                document.body.style.removeProperty("overflow");
                document.body.style.removeProperty("padding-right");
            });
        };

        menu.addEventListener("hidden.bs.offcanvas", cleanupOrphanedBackdrop);

        const closeOnDesktopResize = () => {
            if (window.matchMedia("(min-width: 992px)").matches && menu.classList.contains("show")) {
                Offcanvas.getOrCreateInstance(menu, {
                    backdrop: true,
                    keyboard: true,
                    scroll: false,
                }).hide();
            }
        };

        window.addEventListener("resize", closeOnDesktopResize);

        return () => {
            menu.removeEventListener("hidden.bs.offcanvas", cleanupOrphanedBackdrop);
            window.removeEventListener("resize", closeOnDesktopResize);
        };
    }, []);

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
        const query = navigationSearch.trim();

        if (!showNavigationSearch || query.length < 2) {
            setCatalogSuggestions({ products: [], packages: [] });
            setCatalogSearchLoading(false);
            setCatalogSearchError(false);
            return undefined;
        }

        const controller = new AbortController();
        setCatalogSuggestions({ products: [], packages: [] });
        setCatalogSearchError(false);
        const timer = window.setTimeout(async () => {
            setCatalogSearchLoading(true);
            setCatalogSearchError(false);

            try {
                const response = await fetch("/search/suggestions?q=" + encodeURIComponent(query), {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Search suggestions request failed.");
                }

                const result = await response.json();
                if (!controller.signal.aborted) {
                    setCatalogSuggestions({
                        products: Array.isArray(result.products) ? result.products : [],
                        packages: Array.isArray(result.packages) ? result.packages : [],
                    });
                }
            } catch (error) {
                if (error.name !== "AbortError" && !controller.signal.aborted) {
                    setCatalogSuggestions({ products: [], packages: [] });
                    setCatalogSearchError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCatalogSearchLoading(false);
                }
            }
        }, 220);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [navigationSearch, showNavigationSearch]);



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
                    onClick={openMobileNavigation}
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
                    data-bs-backdrop="true"
                    data-bs-scroll="false"
                    data-bs-keyboard="true"
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
                            onClick={closeMobileNavigation}
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
                                 onClick={handleMobileOffcanvasLinkClick}>
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
                                 onClick={handleMobileOffcanvasLinkClick}>
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
                                 onClick={handleMobileOffcanvasLinkClick}>
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
                                 onClick={handleMobileOffcanvasLinkClick}>
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
                                 onClick={handleMobileOffcanvasLinkClick}>
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
                                        onClick={handleMobileOffcanvasLinkClick}
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
                                        onClick={handleMobileOffcanvasLinkClick}
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
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                        VERIFY EMAIL
                                    </Link>

                                    <button
                                        type="button"
                                        className="btn btn-primary fw-bold w-100"
                                        onClick={handleLogout}
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}>
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
                                        onClick={handleMobileOffcanvasLinkClick}
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
                                        onClick={handleMobileOffcanvasLinkClick}
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

                                    {isAdmin && (
                                        <Link
                                            href="/dashboard"
                                            className="btn btn-primary fw-bold w-100"
                                            style={{
                                                fontFamily: "Outfit, sans-serif",
                                            }}
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                            ADMIN DASHBOARD
                                        </Link>
                                    )}

                                    {isTechnician && (
                                        <Link
                                            href="/technician/dashboard"
                                            className="btn btn-primary fw-bold w-100"
                                            style={{ fontFamily: "Outfit, sans-serif" }}
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                            TECHNICIAN WORKSPACE
                                        </Link>
                                    )}

                                    <Link
                                        href="/settings"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                        SETTINGS
                                    </Link>

                                    <Link
                                        href="/schedules"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                        SCHEDULES
                                    </Link>

                                    <Link
                                        href="/purchases"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                        onClick={handleMobileOffcanvasLinkClick}
                                    >
                                        PURCHASES
                                    </Link>
                                    <Link
                                        href="/inquiries"
                                        className="btn btn-outline-primary fw-bold w-100"
                                        style={{
                                            fontFamily: "Outfit, sans-serif",
                                        }}
                                        onClick={handleMobileOffcanvasLinkClick}
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
                                        }}>
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
                    className="navbar-desktop-auth d-none d-lg-flex align-items-center gap-3"
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
                                className="navbar-user-menu-wrapper"
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowUserMenu((previous) => !previous)}
                                    className={"navbar-user-trigger border-0 d-flex align-items-center justify-content-center" + (showUserMenu ? " is-open" : "")}
                                    aria-label="Open account menu"
                                    aria-haspopup="true"
                                    aria-expanded={showUserMenu}
                                >
                                    <i className="bi bi-person-fill" aria-hidden="true"></i>
                                </button>

                                {showUserMenu && (
                                    <div className="navbar-account-menu bg-body border shadow-lg" role="menu" aria-label="Account menu">
                                        <div className="navbar-account-menu-profile">
                                            <div className="navbar-account-avatar">
                                                <i className="bi bi-person-fill" aria-hidden="true"></i>
                                            </div>
                                            <div className="navbar-account-profile-copy">
                                                <strong title={user?.name}>{user?.name || "SecureView Account"}</strong>
                                                <span title={user?.email}>{user?.email || "Signed-in account"}</span>
                                                <span className="navbar-account-role">
                                                    {isAdmin ? "Administrator" : isTechnician ? "Technician" : "Customer"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="navbar-account-menu-links">
                                            {(isAdmin || isTechnician) && (
                                                <Link
                                                    href={isAdmin ? "/dashboard" : "/technician/dashboard"}
                                                    className="navbar-account-menu-link"
                                                    role="menuitem"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <i className={isAdmin ? "bi bi-speedometer2" : "bi bi-tools"} aria-hidden="true"></i>
                                                    <span>{isAdmin ? "Admin dashboard" : "Technician workspace"}</span>
                                                    <i className="bi bi-arrow-up-right ms-auto" aria-hidden="true"></i>
                                                </Link>
                                            )}
                                            <Link href="/settings" className="navbar-account-menu-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                <i className="bi bi-gear" aria-hidden="true"></i>
                                                <span>Account settings</span>
                                            </Link>
                                            <Link href="/schedules" className="navbar-account-menu-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                <i className="bi bi-calendar3" aria-hidden="true"></i>
                                                <span>Schedules</span>
                                            </Link>
                                            <Link href="/purchases" className="navbar-account-menu-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                <i className="bi bi-bag-check" aria-hidden="true"></i>
                                                <span>Purchases</span>
                                            </Link>
                                            <Link href="/inquiries" className="navbar-account-menu-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                <i className="bi bi-chat-left-text" aria-hidden="true"></i>
                                                <span>Inquiries</span>
                                            </Link>
                                            {!isAdmin && !isTechnician && (
                                                <Link href="/warranty-claims" className="navbar-account-menu-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                    <i className="bi bi-shield-check" aria-hidden="true"></i>
                                                    <span>Warranty claims</span>
                                                </Link>
                                            )}
                                        </div>
                                        <div className="navbar-account-menu-footer">
                                            <Link href="/settings" className="navbar-account-settings-link" role="menuitem" onClick={() => setShowUserMenu(false)}>
                                                <i className="bi bi-sliders" aria-hidden="true"></i>
                                                Manage account
                                            </Link>
                                        </div>
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