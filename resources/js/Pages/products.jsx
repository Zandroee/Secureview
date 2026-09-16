import '../../css/landing.css';
import Navbar from '../Components/Navbar';
import Footer from '../Components/footer';
import { useState } from "react";

export default function products() {
    return (
        <div>
            <Navbar />

            <div className="container-fluid mt-5 px-0s">

                {/* Search Bar */}
                <div className="position-relative w-50 mx-auto mb-5">
                    <input type="text" className="form-control rounded-pill bg-light border-0 py-3 px-5" placeholder="SEARCH"/>
                    <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y me-2" onClick={() => console.log("Search clicked")}>
                        <i className="bi bi-search text-secondary"></i>
                    </button>
                </div>

                {/* Filters + Products */}
                <div className="row">

                    {/* Filters */}
                    <div className="col-md-3">
                        <div className="card shadow-sm">
                            <div className="card-body">

                                <h5 className="card-title mb-4">
                                    Filters
                                </h5>

                                {/* Category */}
                                <h6>Category</h6>

                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="dome"/>
                                    <label className="form-check-label" htmlFor="dome">
                                        Dome
                                    </label>
                                </div>

                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="bullet"/>
                                    <label className="form-check-label" htmlFor="bullet">
                                        Bullet
                                    </label>
                                </div>

                                <div className="form-check mb-4">
                                    <input className="form-check-input" type="checkbox" id="360_camera"/>
                                    <label className="form-check-label" htmlFor="360_camera">
                                        360° Camera
                                    </label>
                                </div>

                                {/* Price */}
                                <h6>Price</h6>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="price" id="low"/>
                                    <label className="form-check-label" htmlFor="low">
                                        Under ₱500
                                    </label>
                                </div>

                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="price" id="medium"/>
                                    <label className="form-check-label" htmlFor="medium">
                                        ₱500 - ₱1,000
                                    </label>
                                </div>

                                <div className="form-check mb-4">
                                    <input className="form-check-input" type="radio" name="price" id="high"/>
                                    <label className="form-check-label" htmlFor="high">
                                        ₱1,000+
                                    </label>
                                </div>

                                {/* Rating */}
                                <h6>Rating</h6>

                                <select className="form-select mb-3">
                                    <option>Any Rating</option>
                                    <option>⭐⭐⭐⭐⭐</option>
                                    <option>⭐⭐⭐⭐+</option>
                                    <option>⭐⭐⭐+</option>
                                </select>

                                <button type="button" className="btn btn-dark w-100">
                                    Apply Filters
                                </button>

                            </div>
                        </div>
                    </div>

                    {/* Products Area */}
                    <div className="col-md-9">
                        <h1 className="mb-4">Products</h1>
                        <p>
                            Explore our range of products designed to meet
                            your needs.
                        </p>
                        {/* Add product cards here */}
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}