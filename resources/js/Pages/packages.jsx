import "../../css/landing.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/footer";
import PackageCard from "../Components/PackageCard";
import Pagination from "../Components/Pagination";

import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function Packages({ packages = [] }) {

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState([]);
    const [price, setPrice] = useState("");
    const [rating, setRating] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const packagesPerPage = 6;

    const packageCategories = useMemo(() => {
        return [...new Set(packages.map((pkg) => pkg.category).filter(Boolean))];
    }, [packages]);

    const filteredPackages = useMemo(() => {
        return packages.filter((pkg) => {

            const matchesSearch = pkg.name.toLowerCase().includes(search.toLowerCase());

            const matchesCategory = category.length === 0 || category.includes(pkg.category);

            let matchesPrice = true;

            if (price === "low") {
                matchesPrice = Number(pkg.price) < 15000;
            }

            if (price === "medium") {
                matchesPrice = Number(pkg.price) >= 15000 && Number(pkg.price) <= 25000;
            }

            if (price === "high") {
                matchesPrice = Number(pkg.price) > 25000;
            }

            let matchesRating = true;

            if (rating === "5") {
                matchesRating = Number(pkg.rating) === 5;
            }

            if (rating === "4") {
                matchesRating = Number(pkg.rating) >= 4;
            }

            if (rating === "3") {
                matchesRating = Number(pkg.rating) >= 3;
            }

            return matchesSearch && matchesCategory && matchesPrice && matchesRating;
        });
    }, [packages, search, category, price, rating]);

    const totalPages = Math.ceil(filteredPackages.length / packagesPerPage);
    const startIndex = (currentPage - 1) * packagesPerPage;
    const currentPackages = filteredPackages.slice(startIndex, startIndex + packagesPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleCategoryChange = (value) => {
        setCategory((previous) => previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]);
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

    const resetFilters = () => {
        setCategory([]);
        setPrice("");
        setRating("");
        setSearch("");
        setCurrentPage(1);
    };

    return (
        <div>

            <Navbar />

            <div className="container-fluid mt-5 px-4 px-md-5">

                {/* SEARCH */}

                <div className="position-relative w-50 mx-auto mb-5">

                    <input type="text" className="form-control border-0" placeholder="SEARCH" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} style={{ height: "60px", borderRadius: "24px", backgroundColor: "#f1f1f1", padding: "0 48px 0 30px", fontSize: "1rem", fontFamily: "Outfit, sans-serif", color: "#555", boxShadow: "none", textTransform: "uppercase" }} />

                    <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-4 text-secondary" style={{ fontSize: "1rem" }}></i>

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

                                {packageCategories.length > 0 ? (
                                    packageCategories.map((item) => (
                                        <div className="form-check" key={item}>
                                            <input className="form-check-input" type="checkbox" id={`category-${item}`} checked={category.includes(item)} onChange={() => handleCategoryChange(item)} />
                                            <label className="form-check-label" htmlFor={`category-${item}`}>
                                                {item}
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted small">No categories available</p>
                                )}

                                <div className="mb-4"></div>

                                {/* PRICE */}

                                <h6>Price</h6>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="package-price" id="package-low" checked={price === "low"} onChange={() => handlePriceChange("low")} />
                                    <label className="form-check-label" htmlFor="package-low">Under ₱15,000</label>
                                </div>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="package-price" id="package-medium" checked={price === "medium"} onChange={() => handlePriceChange("medium")} />
                                    <label className="form-check-label" htmlFor="package-medium">₱15,000 - ₱25,000</label>
                                </div>

                                <div className="form-check mb-4">
                                    <input className="form-check-input" type="radio" name="package-price" id="package-high" checked={price === "high"} onChange={() => handlePriceChange("high")} />
                                    <label className="form-check-label" htmlFor="package-high">₱25,000+</label>
                                </div>

                                {/* RATING */}

                                <h6>Rating</h6>

                                <select value={rating} onChange={(e) => handleRatingChange(e.target.value)} className="form-select border-0 mb-3" style={{ height: "50px", borderRadius: "25px", backgroundColor: "#f1f1f1", color: "#6c6c6c", fontSize: "1rem", fontWeight: "500", padding: "0 42px 0 16px", boxShadow: "none", appearance: "none", textTransform: "uppercase" }}>
                                    <option value="">Any Rating</option>
                                    <option value="5">5 Stars</option>
                                    <option value="4">4 Stars</option>
                                    <option value="3">3 Stars</option>
                                </select>

                                {/* RESET */}

                                <button type="button" className="btn btn-primary w-100" onClick={resetFilters}>
                                    RESET FILTERS
                                </button>

                            </div>

                        </div>

                    </div>

                    {/* PACKAGES */}

                    <div className="col-lg-9">

                        <div className="d-flex justify-content-between align-items-center mb-4">

                            <div>

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">

                                    <div>

                                        <h1 className="products-page-title mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            Browse Packages
                                        </h1>

                                        <p className="products-page-description mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            Explore our CCTV packages designed for home, business, and other security needs.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <span className="text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {filteredPackages.length} PACKAGES FOUND
                            </span>

                        </div>

                        {/* PACKAGE GRID */}

                        {currentPackages.length > 0 ? (

                            <div className="row g-4">

                                {currentPackages.map((pkg) => (
                                    <div className="col-sm-6 col-lg-4" key={pkg.id}>
                                        <PackageCard name={pkg.name} image={pkg.image} price={pkg.price} badge={pkg.badge} specifications={pkg.specifications} rating={pkg.rating} onDetails={() => router.visit(`/packages/${pkg.id}`)} />
                                    </div>
                                ))}

                            </div>

                        ) : (

                            <div className="text-center py-5">

                                <i className="bi bi-camera-video fs-1 text-muted"></i>

                                <h4 className="mt-3">
                                    No packages found
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