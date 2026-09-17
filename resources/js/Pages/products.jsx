import "../../css/landing.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/footer";
import ProductCard from "../Components/ProductCard";
import Pagination from "../Components/Pagination";

import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function Products({ products }) {

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    const [search, setSearch] = useState("");

    // -------------------------------------------------
    // FILTERS
    // -------------------------------------------------

    const [category, setCategory] = useState({
        dome: false,
        bullet: false,
        camera360: false,
    });

    const [price, setPrice] = useState("");
    const [rating, setRating] = useState("");

    // -------------------------------------------------
    // PAGINATION
    // -------------------------------------------------

    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 8;

    // -------------------------------------------------
    // FILTER PRODUCTS
    // -------------------------------------------------

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {

            const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());

            const selectedCategories = Object.entries(category).filter(([_, selected]) => selected).map(([key]) => key);

            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);

            let matchesPrice = true;

            if (price === "low") {
                matchesPrice = product.price < 500;
            }

            if (price === "medium") {
                matchesPrice = product.price >= 500 && product.price <= 1000;
            }

            if (price === "high") {
                matchesPrice = product.price > 1000;
            }

            let matchesRating = true;

            if (rating === "5") {
                matchesRating = product.rating === 5;
            }

            if (rating === "4") {
                matchesRating = product.rating >= 4;
            }

            if (rating === "3") {
                matchesRating = product.rating >= 3;
            }

            return matchesSearch && matchesCategory && matchesPrice && matchesRating;
        });
    }, [search, category, price, rating]);

    // -------------------------------------------------
    // PAGINATION
    // -------------------------------------------------

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

    // -------------------------------------------------
    // PAGE CHANGE
    // -------------------------------------------------

    const handlePageChange = (page) => {
        setCurrentPage(page);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // -------------------------------------------------
    // FILTER HANDLERS
    // -------------------------------------------------

    const handleCategoryChange = (name) => {
        setCategory((previous) => ({ ...previous, [name]: !previous[name] }));
        setCurrentPage(1);
    };

    const handlePriceChange = (value) => {
        setPrice(value);
        setCurrentPage(1);
    };

    const handleRatingChange = (value) => {
        setRating(value);
        setCurrentPage(1);
    };

    return (
        <div>

            <Navbar />

            <div className="container-fluid mt-5 px-4 px-md-5">

                {/* SEARCH */}

                <div className="products-search-wrapper position-relative w-50 mx-auto mb-5">

                    <input type="text" className="products-search form-control rounded-pill py-3 px-5" placeholder="Search CCTV products..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />

                    <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y me-2">
                        <i className="bi bi-search text-secondary"></i>
                    </button>

                </div>

                <div className="row g-4">

                    {/* FILTERS */}

                    <div className="col-lg-3" style={{ fontFamily: "Outfit, sans-serif" }}>

                        <div className="products-filter-card card shadow-none sticky-lg-top" style={{ top: "20px" }}>

                            <div className="card-body">

                                <h5 className="products-filter-title mb-3">
                                    Filters
                                </h5>

                                {/* CATEGORY */}

                                <h6>Category</h6>

                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="dome" checked={category.dome} onChange={() => handleCategoryChange("dome")} />
                                    <label className="form-check-label" htmlFor="dome">Dome</label>
                                </div>

                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="bullet" checked={category.bullet} onChange={() => handleCategoryChange("bullet")} />
                                    <label className="form-check-label" htmlFor="bullet">Bullet</label>
                                </div>

                                <div className="form-check mb-4">
                                    <input className="form-check-input" type="checkbox" id="360_camera" checked={category.camera360} onChange={() => handleCategoryChange("camera360")} />
                                    <label className="form-check-label" htmlFor="360_camera">360° Camera</label>
                                </div>

                                {/* PRICE */}

                                <h6>Price</h6>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="price" id="low" checked={price === "low"} onChange={() => handlePriceChange("low")} />
                                    <label className="form-check-label" htmlFor="low">Under ₱500</label>
                                </div>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="price" id="medium" checked={price === "medium"} onChange={() => handlePriceChange("medium")} />
                                    <label className="form-check-label" htmlFor="medium">₱500 - ₱1,000</label>
                                </div>

                                <div className="form-check mb-4">
                                    <input className="form-check-input" type="radio" name="price" id="high" checked={price === "high"} onChange={() => handlePriceChange("high")} />
                                    <label className="form-check-label" htmlFor="high">₱1,000+</label>
                                </div>

                                {/* RATING */}

                                <h6>Rating</h6>

                                <select className="form-select mb-3" value={rating} onChange={(e) => handleRatingChange(e.target.value)}>
                                    <option value="">Any Rating</option>
                                    <option value="5">⭐⭐⭐⭐⭐</option>
                                    <option value="4">⭐⭐⭐⭐+</option>
                                    <option value="3">⭐⭐⭐+</option>
                                </select>

                                {/* RESET */}

                                <button type="button" className="btn btn-dark w-100" onClick={() => { setCategory({ dome: false, bullet: false, camera360: false }); setPrice(""); setRating(""); setSearch(""); setCurrentPage(1); }}>
                                    RESET FILTERS
                                </button>

                            </div>

                        </div>

                    </div>

                    {/* PRODUCTS */}

                    <div className="col-lg-9">

                        <div className="d-flex justify-content-between align-items-center mb-4">

                            <div>

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">

                                    <div>
                                        <h1 className="products-page-title mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            Browse Products
                                        </h1>

                                        <p className="products-page-description mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            Explore our range of CCTV products designed for home and business security.
                                        </p>
                                    </div>

                                </div>

                            </div>

                            <span className="text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {filteredProducts.length} PRODUCTS FOUND
                            </span>

                        </div>

                        {/* PRODUCT GRID */}

                        {currentProducts.length > 0 ? (

                            <div className="row g-4">

                                {currentProducts.map((product) => (
                                    <div className="col-sm-6 col-xl-3" key={product.id}>
                                        <ProductCard name={product.name} image={product.image} price={product.price} badge={product.badge} specifications={product.specifications} onDetails={() => router.visit(`/products/${product.id}`)} />
                                    </div>
                                ))}

                            </div>

                        ) : (

                            <div className="text-center py-5">

                                <i className="bi bi-camera-video fs-1 text-muted"></i>

                                <h4 className="mt-3">
                                    No products found
                                </h4>

                                <p className="text-muted">
                                    Try changing your search or filters.
                                </p>

                            </div>

                        )}

                        {/* PAGINATION */}

                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

                    </div>

                </div>

            </div>

            <Footer />

        </div>
    );
}