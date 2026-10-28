import "../../css/landing.css";
import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import ProductCard from "../Components/ProductCard";
import Pagination from "../Components/Pagination";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

function searchableValues(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return value === null || value === undefined ? [] : [value];
}

function normalize(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function distinctDisplayValues(values) {
    const options = new Map();

    values.forEach((value) => {
        const display = String(value ?? "").trim().replace(/\s+/g, " ");
        const key = normalize(display);
        if (key && !options.has(key)) options.set(key, display);
    });

    return [...options.values()].sort((a, b) => a.localeCompare(b));
}

function isMobileFiltersViewport() {
    return typeof window !== "undefined"
        && window.matchMedia("(max-width: 991.98px)").matches;
}

function money(value) {
    return "₱" + Number(value || 0).toLocaleString("en-PH");
}

export default function Products({ products = [] }) {
    const { url } = usePage();
    const queryString = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
    const searchFromUrl = new URLSearchParams(queryString).get("search") ?? "";

    const [search, setSearch] = useState(searchFromUrl);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [rating, setRating] = useState("");
    const [availability, setAvailability] = useState("all");
    const [sortBy, setSortBy] = useState("recommended");
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobileFilterLayout, setIsMobileFilterLayout] = useState(isMobileFiltersViewport);
    const [filtersOpen, setFiltersOpen] = useState(() => !isMobileFiltersViewport());

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 991.98px)");
        const synchronizeFilterLayout = () => {
            const isMobile = mediaQuery.matches;
            setIsMobileFilterLayout(isMobile);
            setFiltersOpen(!isMobile);
        };

        synchronizeFilterLayout();
        mediaQuery.addEventListener("change", synchronizeFilterLayout);
        return () => mediaQuery.removeEventListener("change", synchronizeFilterLayout);
    }, []);

    useEffect(() => {
        setSearch(searchFromUrl);
        setCurrentPage(1);
    }, [searchFromUrl]);

    const productCategories = useMemo(
        () => distinctDisplayValues(products.map((product) => product.category)),
        [products]
    );

    const productBrands = useMemo(
        () => distinctDisplayValues(products.map((product) => product.brand)),
        [products]
    );

    const filteredProducts = useMemo(() => {
        const query = normalize(search);
        const selectedCategories = new Set(categories.map(normalize));
        const selectedBrands = new Set(brands.map(normalize));
        const minimum = minPrice.trim() === "" ? null : Number(minPrice);
        const maximum = maxPrice.trim() === "" ? null : Number(maxPrice);

        const result = products.filter((product) => {
            const text = [
                product.name,
                product.brand,
                product.category,
                product.badge,
                product.warranty,
                ...searchableValues(product.specifications),
            ].filter(Boolean).join(" ");
            const matchesSearch = !query || normalize(text).includes(query);
            const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(normalize(product.category));
            const matchesBrand = selectedBrands.size === 0 || selectedBrands.has(normalize(product.brand));
            const priceValue = Number(product.price || 0);
            const matchesMinimum = minimum === null || priceValue >= minimum;
            const matchesMaximum = maximum === null || priceValue <= maximum;
            const ratingValue = Number(product.rating || 0);
            const matchesRating = rating === "" || ratingValue >= Number(rating);
            const inStock = Number(product.stock_quantity || 0) > 0;
            const matchesAvailability = availability === "all"
                || (availability === "in_stock" && inStock)
                || (availability === "out_of_stock" && !inStock);

            return matchesSearch && matchesCategory && matchesBrand && matchesMinimum && matchesMaximum
                && matchesRating && matchesAvailability;
        });

        const sorters = {
            name_asc: (a, b) => String(a.name).localeCompare(String(b.name)),
            name_desc: (a, b) => String(b.name).localeCompare(String(a.name)),
            price_asc: (a, b) => Number(a.price) - Number(b.price),
            price_desc: (a, b) => Number(b.price) - Number(a.price),
            rating_desc: (a, b) => Number(b.rating || 0) - Number(a.rating || 0),
            stock_desc: (a, b) => Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0),
        };

        return sortBy === "recommended" ? result : result.sort(sorters[sortBy] ?? (() => 0));
    }, [products, search, categories, brands, minPrice, maxPrice, rating, availability, sortBy]);

    const productsPerPage = 8;
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const startIndex = (safePage - 1) * productsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggleCategory = (value) => {
        setCategories((previous) => previous.includes(value)
            ? previous.filter((item) => item !== value)
            : [...previous, value]);
        setCurrentPage(1);
    };

    const toggleBrand = (value) => {
        setBrands((previous) => previous.includes(value)
            ? previous.filter((item) => item !== value)
            : [...previous, value]);
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setSearch("");
        setCategories([]);
        setBrands([]);
        setMinPrice("");
        setMaxPrice("");
        setRating("");
        setAvailability("all");
        setSortBy("recommended");
        setCurrentPage(1);
    };

    const activeFilters = [
        ...(search.trim() ? [{ key: "search", label: `Search: “${search.trim()}”`, remove: () => setSearch("") }] : []),
        ...categories.map((value) => ({ key: "category-" + value, label: value, remove: () => toggleCategory(value) })),
        ...brands.map((value) => ({ key: "brand-" + value, label: "Brand: " + value, remove: () => toggleBrand(value) })),
        ...(minPrice !== "" ? [{ key: "minPrice", label: "From " + money(minPrice), remove: () => setMinPrice("") }] : []),
        ...(maxPrice !== "" ? [{ key: "maxPrice", label: "Up to " + money(maxPrice), remove: () => setMaxPrice("") }] : []),
        ...(rating !== "" ? [{ key: "rating", label: rating + "+ stars", remove: () => setRating("") }] : []),
        ...(availability !== "all" ? [{
            key: "availability",
            label: availability === "in_stock" ? "In stock" : "Out of stock",
            remove: () => setAvailability("all"),
        }] : []),
    ];

    return (
        <div>
            <Navbar />

            <main className="container-fluid mt-4 mt-lg-5 px-3 px-xl-5 catalog-listing-main" style={{ fontFamily: "Outfit, sans-serif" }}>
                <div className="position-relative w-100 mx-auto mb-4 mb-lg-5" style={{ maxWidth: "820px" }}>
                    <label htmlFor="product-search" className="visually-hidden">Search products</label>
                    <input
                        id="product-search"
                        type="search"
                        className="form-control catalog-search-input"
                        placeholder="Search products by name, brand, category, feature, or warranty"
                        value={search}
                        onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                        style={{
                            height: "56px",
                            borderRadius: "18px",
                            backgroundColor: "#f7f8fa",
                            padding: "0 52px 0 22px",
                            fontSize: "1rem",
                            color: "#343a40",
                            boxShadow: "none",
                        }}
                    />
                    <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-4 text-secondary" aria-hidden="true" />
                </div>

                <div className="row g-4 align-items-start">
                    <aside className="col-12 col-lg-3 col-xl-2">
                        <section className="products-filter-card card shadow-none" style={{ borderRadius: "12px" }}>
                            <div className="card-body p-3 p-xl-4">
                                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                    <h2 className="products-filter-title h5 mb-0">Filters</h2>
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm d-lg-none"
                                            onClick={() => setFiltersOpen((open) => !open)}
                                            aria-expanded={filtersOpen}
                                            aria-controls="product-filter-controls"
                                        >
                                            {filtersOpen ? "Hide filters" : `Show filters${activeFilters.length ? ` (${activeFilters.length})` : ""}`}
                                        </button>
                                        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={resetFilters} disabled={activeFilters.length === 0 && sortBy === "recommended"}>
                                            Reset all
                                        </button>
                                    </div>
                                </div>

                                <div id="product-filter-controls" hidden={isMobileFilterLayout && !filtersOpen}>
                                    <div className="mb-4">
                                    <h3 className="h6 fw-bold mb-2">Category</h3>
                                    {productCategories.length ? productCategories.map((item) => (
                                        <div className="form-check mb-1" key={item}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={"product-category-" + item}
                                                checked={categories.includes(item)}
                                                onChange={() => toggleCategory(item)}
                                            />
                                            <label className="form-check-label" htmlFor={"product-category-" + item}>{item}</label>
                                        </div>
                                    )) : <p className="small text-muted mb-0">No categories available</p>}
                                </div>

                                <div className="mb-4">
                                    <h3 className="h6 fw-bold mb-2">Brand</h3>
                                    {productBrands.length ? productBrands.map((item) => (
                                        <div className="form-check mb-1" key={item}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={"product-brand-" + item}
                                                checked={brands.includes(item)}
                                                onChange={() => toggleBrand(item)}
                                            />
                                            <label className="form-check-label" htmlFor={"product-brand-" + item}>{item}</label>
                                        </div>
                                    )) : <p className="small text-muted mb-0">No brands available</p>}
                                </div>

                                <div className="mb-4">
                                    <h3 className="h6 fw-bold mb-2">Price range</h3>
                                    <div className="row g-2">
                                        <div className="col-6 col-lg-12 col-xxl-6">
                                            <label htmlFor="product-min-price" className="form-label small text-muted mb-1">Minimum (₱)</label>
                                            <input id="product-min-price" type="number" min="0" step="1" inputMode="numeric" className="form-control" placeholder="No minimum" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setCurrentPage(1); }} />
                                        </div>
                                        <div className="col-6 col-lg-12 col-xxl-6">
                                            <label htmlFor="product-max-price" className="form-label small text-muted mb-1">Maximum (₱)</label>
                                            <input id="product-max-price" type="number" min="0" step="1" inputMode="numeric" className="form-control" placeholder="No maximum" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setCurrentPage(1); }} />
                                        </div>
                                    </div>
                                    {minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice) && (
                                        <p className="small text-danger mt-2 mb-0">Minimum price must not exceed maximum price.</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="product-min-rating" className="form-label h6 fw-bold mb-2">Minimum rating</label>
                                    <select id="product-min-rating" value={rating} onChange={(event) => { setRating(event.target.value); setCurrentPage(1); }} className="form-select">
                                        <option value="">Any rating</option>
                                        <option value="1">1 star &amp; up</option>
                                        <option value="2">2 stars &amp; up</option>
                                        <option value="3">3 stars &amp; up</option>
                                        <option value="4">4 stars &amp; up</option>
                                        <option value="5">5 stars</option>
                                    </select>
                                    <div className="small text-muted mt-1">Unreviewed products have a 0 rating.</div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="product-availability" className="form-label h6 fw-bold mb-2">Availability</label>
                                    <select id="product-availability" className="form-select" value={availability} onChange={(event) => { setAvailability(event.target.value); setCurrentPage(1); }}>
                                        <option value="all">All products</option>
                                        <option value="in_stock">In stock</option>
                                        <option value="out_of_stock">Out of stock</option>
                                    </select>
                                </div>

                                    <button type="button" className="btn btn-primary w-100 fw-semibold" onClick={resetFilters} disabled={activeFilters.length === 0 && sortBy === "recommended"}>
                                        <i className="bi bi-arrow-counterclockwise me-2" />Reset filters
                                    </button>
                                </div>
                            </div>
                        </section>
                    </aside>

                    <section className="col-12 col-lg-9 col-xl-10" aria-labelledby="products-heading">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-3">
                            <div>
                                <h1 id="products-heading" className="products-page-title mb-1">Browse Products</h1>
                                <p className="products-page-description mb-0">Explore our range of CCTV products designed for home and business security.</p>
                            </div>
                            <div className="text-primary fw-semibold text-nowrap">
                                {filteredProducts.length === products.length
                                    ? `${filteredProducts.length} products`
                                    : `${filteredProducts.length} of ${products.length} products`}
                            </div>
                        </div>

                        {activeFilters.length > 0 && (
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-3" aria-label="Active filters">
                                <span className="small text-muted me-1">Active filters:</span>
                                {activeFilters.map((filter) => (
                                    <button key={filter.key} type="button" onClick={() => { filter.remove(); setCurrentPage(1); }} className="btn btn-sm btn-outline-secondary rounded-pill">
                                        {filter.label} <span aria-hidden="true" className="ms-1">×</span>
                                    </button>
                                ))}
                                <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={resetFilters}>Clear all</button>
                            </div>
                        )}

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 border-bottom pb-3 mb-4">
                            <span className="small text-muted">
                                {filteredProducts.length === 0
                                    ? "No matching products"
                                    : `Showing ${startIndex + 1}–${Math.min(startIndex + productsPerPage, filteredProducts.length)} of ${filteredProducts.length}`}
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <label htmlFor="product-sort" className="small text-muted text-nowrap">Sort by</label>
                                <select id="product-sort" className="form-select form-select-sm" style={{ minWidth: "185px" }} value={sortBy} onChange={(event) => { setSortBy(event.target.value); setCurrentPage(1); }}>
                                    <option value="recommended">Recommended</option>
                                    <option value="name_asc">Name: A to Z</option>
                                    <option value="name_desc">Name: Z to A</option>
                                    <option value="price_asc">Price: Low to high</option>
                                    <option value="price_desc">Price: High to low</option>
                                    <option value="rating_desc">Highest rated</option>
                                    <option value="stock_desc">Most in stock</option>
                                </select>
                            </div>
                        </div>

                        {minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice) ? (
                            <div className="alert alert-warning">Adjust the price range to continue.</div>
                        ) : currentProducts.length > 0 ? (
                            <div className="row g-3 g-xl-4">
                                {currentProducts.map((product) => (
                                    <div className="col-12 col-sm-6 col-xl-4 col-xxl-3" key={product.id}>
                                        <ProductCard
                                            name={product.name}
                                            brand={product.brand}
                                            reviewsCount={product.reviews_count}
                                            image={product.image}
                                            price={product.price}
                                            originalPrice={product.original_price}
                                            saleActive={product.sale_active}
                                            saleDiscountPercent={product.sale_discount_percent}
                                            badge={product.badge}
                                            specifications={product.specifications}
                                            rating={product.rating}
                                            available={Number(product.stock_quantity) > 0}
                                            onDetails={() => router.visit(`/products/${product.id}`)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5 border rounded-3">
                                <i className="bi bi-funnel fs-1 text-muted" aria-hidden="true" />
                                <h2 className="h4 mt-3">No products match these filters</h2>
                                <p className="text-muted mb-3">Try another search, expand the price range, or remove a filter.</p>
                                <button type="button" className="btn btn-primary" onClick={resetFilters}>Clear filters</button>
                            </div>
                        )}

                        <div className="mt-4">
                            <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
