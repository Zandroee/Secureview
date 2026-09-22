import Navbar from "../Components/Navbar";
import Footer from "../Components/footer";
import { router } from "@inertiajs/react";
import { useState } from "react";

function Stars({ rating }) {
    return (
        <span className="text-warning">
            {[1, 2, 3, 4, 5].map((star) => (
                <i key={star} className={star <= Math.round(Number(rating) || 0) ? "bi bi-star-fill" : "bi bi-star"}></i>
            ))}
        </span>
    );
}

function ReviewSummary({ reviews, rating }) {
    const counts = [5, 4, 3, 2, 1].map((value) => reviews.filter((review) => Number(review.rating) === value).length);
    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / total : Number(rating || 0);

    return (
        <div className="border rounded-3 p-3 d-flex align-items-center gap-4" style={{ width: "100%", maxWidth: "520px", minHeight: "120px" }}>

            <div className="d-flex flex-column align-items-center justify-content-center" style={{ width: "90px", minWidth: "90px" }}>

                <div className="d-flex align-items-center justify-content-center bg-warning text-white fw-bold rounded-2" style={{ width: "68px", height: "58px", fontSize: "1.7rem" }}>
                    {average.toFixed(1)}
                </div>

                <small className="text-muted text-center mt-2" style={{ fontSize: "0.6rem" }}>
                    Based on {total} Reviews
                </small>

            </div>

            <div className="flex-grow-1">

                {[5, 4, 3, 2, 1].map((star) => {
                    const count = counts[5 - star];
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                        <div key={star} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: "0.75rem" }}>

                            <span className="text-warning fw-semibold" style={{ width: "30px", minWidth: "30px" }}>
                                {star} ★
                            </span>

                            <div className="flex-grow-1 bg-light rounded-pill overflow-hidden" style={{ height: "10px" }}>
                                <div className="bg-warning rounded-pill" style={{ width: `${percentage}%`, height: "100%", minWidth: percentage > 0 ? "8px" : "0" }}></div>
                            </div>

                            <span className="text-muted text-end" style={{ width: "25px", minWidth: "25px" }}>
                                {count}
                            </span>

                        </div>
                    );
                })}

            </div>

        </div>
    );
}

export default function PackageDetails({ package: packageData, reviews = [] }) {
    const [amount, setAmount] = useState(1);
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewFilter, setReviewFilter] = useState("all");

    const specifications = Array.isArray(packageData.specifications) ? packageData.specifications : [];
    const filteredReviews = reviewFilter === "all" ? reviews : reviews.filter((review) => Number(review.rating) === Number(reviewFilter));
    const reviewsPerPage = 3;
    const totalReviewPages = Math.ceil(filteredReviews.length / reviewsPerPage);
    const startIndex = (reviewPage - 1) * reviewsPerPage;
    const currentReviews = filteredReviews.slice(startIndex, startIndex + reviewsPerPage);

    return (
        <div>
            <Navbar />

            <main className="container py-5">

                <section className="border p-2 p-md-3">

                    <div className="row g-3">

                        <div className="col-lg-6">
                            {packageData.image ? (
                                <img src={packageData.image} alt={packageData.name} className="img-fluid w-100" style={{ height: "330px", objectFit: "cover" }} />
                            ) : (
                                <div className="bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ height: "330px" }}>
                                    <i className="bi bi-box-seam text-secondary" style={{ fontSize: "5rem" }}></i>
                                </div>
                            )}
                        </div>

                        <div className="col-lg-6 d-flex flex-column justify-content-center">

                            {packageData.badge && (
                                <span className="badge bg-primary align-self-start mb-2">
                                    {packageData.badge}
                                </span>
                            )}

                            <h2 className="fw-bold mb-2">
                                {packageData.name}
                            </h2>

                            <ul className="ps-3 mb-3" style={{ fontSize: "0.8rem" }}>
                                {specifications.map((specification, index) => (
                                    <li key={index} className="mb-1">
                                        {specification}
                                    </li>
                                ))}
                            </ul>

                            <div className="d-flex justify-content-start gap-3 mb-2" style={{ fontSize: "0.8rem" }}>
                                <strong>Warranty: {packageData.warranty}</strong>
                                <strong>Category: {packageData.category}</strong>
                            </div>

                            <div className="d-flex align-items-center gap-3 mb-2">

                                <h2 className="text-primary fw-bold mb-0">
                                    ₱{Number(packageData.price).toLocaleString()}
                                </h2>

                                <span className="text-warning fw-bold">
                                    {Number(packageData.rating || 0).toFixed(1)} <Stars rating={packageData.rating} />
                                </span>

                            </div>

                            <div className="fw-bold mb-3">
                                AMOUNT:

                                <button type="button" className="btn btn-sm btn-light border ms-2" onClick={() => setAmount(Math.max(1, amount - 1))}>
                                    −
                                </button>

                                <span className="mx-2">
                                    {amount}
                                </span>

                                <button type="button" className="btn btn-sm btn-light border" onClick={() => setAmount(amount + 1)}>
                                    +
                                </button>
                            </div>

                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-outline-primary fw-bold">
                                    Inquire
                                </button>

                                <button type="button" className="btn btn-primary fw-bold">
                                    <i className="bi bi-cart3 me-2"></i>
                                    Add To Cart
                                </button>
                            </div>

                        </div>

                    </div>

                </section>

                <section className="mt-2">

                    <h5 className="fw-bold text-center mb-3">
                        Inclusions
                    </h5>

                    <div className="border p-2">

                        {packageData.package_items?.length > 0 ? (
                            packageData.package_items.map((item) => (
                                <div key={item.id} className="border rounded-2 p-2 mb-2">

                                    <div className="row align-items-center g-2">

                                        <div className="col-md-2">
                                            {item.product?.image ? (
                                                <img src={item.product.image} alt={item.product.name} className="img-fluid rounded" style={{ height: "70px", width: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <div className="bg-secondary-subtle rounded d-flex align-items-center justify-content-center" style={{ height: "70px" }}>
                                                    <i className="bi bi-camera-video text-secondary"></i>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-5">

                                            <strong className="d-block">
                                                {item.product?.name}
                                            </strong>

                                            <small className="text-muted">
                                                Amount: {item.quantity}
                                            </small>

                                        </div>

                                        <div className="col-md-3 text-md-end">

                                            <div className="text-primary fw-bold">
                                                ₱{Number(item.price).toLocaleString()}
                                            </div>

                                            <div className="text-warning">
                                                {Number(item.product?.rating || 0).toFixed(1)} <Stars rating={item.product?.rating || 0} />
                                            </div>

                                        </div>

                                        <div className="col-md-2">

                                            <button type="button" className="btn btn-primary btn-sm fw-bold w-100" onClick={() => item.product?.id && router.visit(`/products/${item.product.id}`)}>
                                                DETAILS
                                            </button>

                                        </div>

                                    </div>

                                </div>
                            ))
                        ) : (
                            <p className="text-muted text-center mb-0">
                                No products have been added to this package yet.
                            </p>
                        )}

                    </div>

                </section>

                <section className="mt-4">

                    <div className="row align-items-center g-4">

                        <div className="col-lg-4">
                            <div className="d-flex flex-column align-items-center gap-2">
                                <h2 className="fw-bold mb-0">
                                    Reviews
                                </h2>

                                <div className="position-relative" style={{ width: "192px" }}>
                                    <select value={reviewFilter} onChange={(e) => { setReviewFilter(e.target.value); setReviewPage(1); }} className="form-select border-0" style={{ height: "50px", borderRadius: "25px", backgroundColor: "#f1f1f1", color: "#6c6c6c", fontSize: "0.75rem", fontWeight: "500", padding: "0 42px 0 16px", boxShadow: "none", appearance: "none", textTransform: "uppercase" }}>
                                        <option value="all">All Reviews</option>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-8 d-flex justify-content-lg-end justify-content-center">
                            <ReviewSummary reviews={reviews} rating={packageData.rating} />
                        </div>

                    </div>

                    <div className="mt-4">

                        {currentReviews.length > 0 ? (
                            currentReviews.map((review) => (
                                <div key={review.id} className="border rounded-3 p-3 mb-2">

                                    <div className="d-flex justify-content-between align-items-start gap-3 mb-2">

                                        <div className="d-flex align-items-center gap-2">

                                            <div className="rounded-circle bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ width: "35px", height: "35px", minWidth: "35px" }}>
                                                <i className="bi bi-person text-secondary"></i>
                                            </div>

                                            <strong>
                                                {review.user?.name || "Anonymous"}
                                            </strong>

                                            <span className="text-warning fw-bold">
                                                {Number(review.rating).toFixed(1)} <Stars rating={review.rating} />
                                            </span>

                                        </div>

                                        <small className="text-muted text-nowrap">
                                            {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                                        </small>

                                    </div>

                                    <p className="small text-muted mb-0">
                                        {review.comment}
                                    </p>

                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted py-4 border rounded-3">
                                No reviews yet.
                            </div>
                        )}

                    </div>

                    {totalReviewPages > 1 && (
                        <div className="d-flex justify-content-center align-items-center gap-2 mt-3">

                            <button type="button" className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }} disabled={reviewPage === 1} onClick={() => setReviewPage(reviewPage - 1)}>
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            {Array.from({ length: totalReviewPages }, (_, index) => index + 1).map((page) => (
                                <button type="button" key={page} className="btn btn-sm d-flex align-items-center justify-content-center fw-semibold" style={{ width: "30px", height: "30px", padding: 0, borderRadius: "50%", backgroundColor: reviewPage === page ? "#0d6efd" : "#fff", border: "1px solid #dee2e6", color: reviewPage === page ? "#fff" : "#495057" }} onClick={() => setReviewPage(page)}>
                                    {page}
                                </button>
                            ))}

                            <button type="button" className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }} disabled={reviewPage === totalReviewPages} onClick={() => setReviewPage(reviewPage + 1)}>
                                <i className="bi bi-chevron-right"></i>
                            </button>

                        </div>
                    )}

                </section>

            </main>

            <Footer />
        </div>
    );
}