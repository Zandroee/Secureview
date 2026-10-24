import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import catalogImageUrl from "../Components/catalogImageUrl";
import ReviewPhotoPicker, { reviewPhotoUrl } from "../Components/ReviewPhotoPicker";

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

export default function PackageDetails({ package: packageData, reviews = [], canReview = false, userReview = null }) {
    const { props } = usePage();
    const user = props.auth?.user;

    const [amount, setAmount] = useState(1);
    const [cartMessage, setCartMessage] = useState("");
    const [cartError, setCartError] = useState("");
    const galleryImages = useMemo(() => {
        const rawImages = Array.isArray(packageData.images) && packageData.images.length
            ? packageData.images
            : (packageData.image ? [packageData.image] : []);

        return rawImages.map(catalogImageUrl).filter(Boolean);
    }, [packageData.images, packageData.image]);

    const [selectedImage, setSelectedImage] = useState(galleryImages[0] ?? "");
    const [failedImageUrls, setFailedImageUrls] = useState([]);
    const isImageFailed = (url) => failedImageUrls.includes(url);
    const markImageFailed = (url) => setFailedImageUrls((current) =>
        current.includes(url) ? current : [...current, url]
    );
    const displayedImage = galleryImages.includes(selectedImage) ? selectedImage : (galleryImages[0] ?? "");

    // Rotate through the gallery slowly. Selecting a thumbnail resets the timer;
    // images that already failed to load are skipped automatically.
    useEffect(() => {
        if (galleryImages.length < 2) return undefined;

        const timer = window.setTimeout(() => {
            setSelectedImage((current) => {
                const currentIndex = galleryImages.indexOf(current);
                const startIndex = currentIndex < 0 ? 0 : currentIndex;

                for (let step = 1; step <= galleryImages.length; step += 1) {
                    const candidate = galleryImages[(startIndex + step) % galleryImages.length];

                    if (!failedImageUrls.includes(candidate)) {
                        return candidate;
                    }
                }

                return current;
            });
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [galleryImages, selectedImage, failedImageUrls]);

    const availableStock = Math.max(0, Number(packageData.available_stock ?? 0));
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewFilter, setReviewFilter] = useState("all");
    const [reviewRating, setReviewRating] = useState(Number(userReview?.rating || 5));
    const [reviewComment, setReviewComment] = useState(userReview?.comment || "");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSubmitError, setReviewSubmitError] = useState("");
    const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState("");
    const [reviewPhotos, setReviewPhotos] = useState([]);
    const [removeReviewPhotos, setRemoveReviewPhotos] = useState([]);

    const handleSubmitReview = (event) => {
        event.preventDefault();
        setReviewSubmitError("");
        setReviewSubmitSuccess("");
        setReviewSubmitting(true);

        router.post("/reviews", {
            item_type: "package",
            item_id: packageData.id,
            rating: reviewRating,
            comment: reviewComment.trim(),
            images: reviewPhotos,
            remove_images: removeReviewPhotos,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewSubmitSuccess(userReview ? "Your review has been updated." : "Thank you for reviewing this package.");
                setReviewPhotos([]);
                setRemoveReviewPhotos([]);
            },
            onError: (errors) => {
                setReviewSubmitError(errors.review || errors.rating || errors.comment || errors.images || errors["images.0"] || "Unable to save your review. Please try again.");
            },
            onFinish: () => setReviewSubmitting(false),
        });
    };

    const specifications = Array.isArray(packageData.specifications) ? packageData.specifications : [];
    const filteredReviews = reviewFilter === "all" ? reviews : reviews.filter((review) => Number(review.rating) === Number(reviewFilter));
    const reviewsPerPage = 3;
    const totalReviewPages = Math.ceil(filteredReviews.length / reviewsPerPage);
    const startIndex = (reviewPage - 1) * reviewsPerPage;
    const currentReviews = filteredReviews.slice(startIndex, startIndex + reviewsPerPage);

    const handleBuyNow = () => {
        if (!user?.email_verified_at) {
            router.visit("/login");
            return;
        }

        setCartMessage("");
        setCartError("");

        router.post(
            "/checkout/buy-now",
            {
                item_type: "package",
                item_id: packageData.id,
                quantity: amount,
            },
            {
                preserveScroll: true,
                onError: (serverErrors) => {
                    setCartError(
                        serverErrors.stock ||
                        serverErrors.cart ||
                        "Unable to start checkout for this item."
                    );
                },
            }
        );
    };

    const handleAddToCart = () => {
        if (!user?.email_verified_at) {
            router.visit("/login");
            return;
        }

        setCartMessage("");
        setCartError("");

        router.post(
            "/cart/items",
            {
                item_type: "package",
                item_id: packageData.id,
                quantity: amount,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCartMessage("Package added to your cart.");
                },
                onError: (serverErrors) => {
                    setCartError(serverErrors.stock || "Unable to add this package to your cart.");
                },
            }
        );
    };

    return (
        <div>
            <Navbar />

            <main className="container py-5">

                <section className="border p-2 p-md-3">

                    <div className="row g-3">

                        <div className="col-lg-6">
                            {displayedImage && !isImageFailed(displayedImage) ? (
                                <img
                                    key={displayedImage}
                                    src={displayedImage}
                                    alt={packageData.name}
                                    className="img-fluid w-100 rounded-2 catalog-detail-main-image"
                                    onError={() => markImageFailed(displayedImage)}
                                    style={{ height: "330px", objectFit: "contain", objectPosition: "center", backgroundColor: "#f8f9fa" }}
                                />
                            ) : (
                                <div className="bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ height: "330px" }}>
                                    <i className="bi bi-box-seam text-secondary" style={{ fontSize: "5rem" }}></i>
                                </div>
                            )}
                            {galleryImages.length > 1 && (
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {galleryImages.map((image, index) => (
                                        <button
                                            key={image + "-" + index}
                                            type="button"
                                            className={"btn p-1 " + (displayedImage === image ? "border-primary" : "border")}
                                            style={{ borderWidth: displayedImage === image ? "2px" : "1px" }}
                                            aria-label={"View package image " + (index + 1)}
                                            onClick={() => setSelectedImage(image)}
                                        >
                                            {isImageFailed(image) ? (
                                                <div className="bg-secondary-subtle d-flex align-items-center justify-content-center rounded" style={{ width: "68px", height: "68px" }}>
                                                    <i className="bi-box-seam text-secondary" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={image}
                                                    alt={packageData.name + " view " + (index + 1)}
                                                    onError={() => markImageFailed(image)}
                                                    style={{ width: "68px", height: "68px", objectFit: "contain", backgroundColor: "#f8f9fa", padding: "3px" }}
                                                />
                                            )}
                                        </button>
                                    ))}
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

                            <ul className="ps-3 mb-3" style={{ fontSize: "1.05rem", lineHeight: "1.65", overflowWrap: "anywhere" }}>
                                {specifications.map((specification, index) => (
                                    <li key={index} className="mb-1">
                                        {specification}
                                    </li>
                                ))}
                            </ul>

                            <div className="d-flex flex-wrap align-items-center justify-content-start gap-2 gap-md-3 mb-3" style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
                                <strong>Category: {packageData.category}</strong>
                                <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2 py-2">
                                    Installation: {Number(packageData.installation_fee ?? 0) > 0
                                        ? "₱" + Number(packageData.installation_fee).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : "Free"}
                                </span>
                                <strong>Warranty: {packageData.warranty}</strong>
                            </div>

                            <div className="d-flex align-items-center gap-3 mb-2">

                                <h2 className="text-primary fw-bold mb-0">
                                    ₱{Number(packageData.price).toLocaleString()}
                                </h2>

                                <span className="text-warning fw-bold">
                                    {Number(packageData.rating || 0).toFixed(1)} <Stars rating={packageData.rating} />
                                </span>

                            </div>

                            <div
                                className={
                                    "small fw-semibold mb-2 " +
                                    (availableStock > 0 ? "text-success" : "text-danger")
                                }
                            >
                                {availableStock > 0
                                    ? `${availableStock.toLocaleString()} IN STOCK`
                                    : "OUT OF STOCK"}
                            </div>

                            <div className="fw-bold mb-3">
                                AMOUNT:

                                <button type="button" className="btn btn-sm btn-light border ms-2" onClick={() => setAmount(Math.max(1, amount - 1))} disabled={amount <= 1 || availableStock === 0}>
                                    −
                                </button>

                                <span className="mx-2">
                                    {amount}
                                </span>

                                <button type="button" className="btn btn-sm btn-light border" onClick={() => setAmount(Math.min(availableStock, amount + 1))} disabled={amount >= availableStock || availableStock === 0}>
                                    +
                                </button>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary fw-bold"
                                    onClick={handleBuyNow}
                                    disabled={availableStock < amount || availableStock === 0}
                                >
                                    <i className="bi bi-lightning-charge me-2"></i>
                                    Buy Now
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-primary fw-bold"
                                    onClick={handleAddToCart}
                                    disabled={availableStock < amount || availableStock === 0}
                                >
                                    <i className="bi bi-cart3 me-2"></i>
                                    Add To Cart
                                </button>
                            </div>

                            {cartMessage && (
                                <div className="text-success small mt-2">
                                    <i className="bi bi-check-circle me-1"></i>
                                    {cartMessage}
                                </div>
                            )}

                            {cartError && (
                                <div className="text-danger small mt-2">
                                    <i className="bi bi-exclamation-circle me-1"></i>
                                    {cartError}
                                </div>
                            )}

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
                                            {item.product?.image && !isImageFailed(catalogImageUrl(item.product.image)) ? (
                                                <img
                                                    src={catalogImageUrl(item.product.image)}
                                                    alt={item.product.name}
                                                    className="img-fluid rounded"
                                                    onError={() => markImageFailed(catalogImageUrl(item.product.image))}
                                                    style={{ height: "70px", width: "100%", objectFit: "cover" }}
                                                />
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

                                            <div className="text-muted mt-1" style={{ fontSize: "0.95rem" }}>
                                                Quantity included: {item.quantity}
                                            </div>

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


                {(canReview || userReview) && (
                    <div className="border rounded-3 p-3 p-md-4 mb-4" style={{ backgroundColor: "#fff" }}>
                        <h3 className="fw-bold mb-1">
                            {userReview ? "Update your review" : "Rate this package"}
                        </h3>
                        <p className="text-muted small mb-3">
                            Reviews are available to customers who have paid for this package.
                        </p>
                        {reviewSubmitError && (
                            <div className="alert alert-danger py-2" role="alert">{reviewSubmitError}</div>
                        )}
                        {reviewSubmitSuccess && (
                            <div className="alert alert-success py-2" role="status">{reviewSubmitSuccess}</div>
                        )}
                        <form onSubmit={handleSubmitReview}>
                            <label className="form-label fw-semibold d-block">Your rating</label>
                            <div className="d-flex align-items-center gap-2 mb-3" role="group" aria-label="Choose a rating from one to five stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="btn btn-link p-0 text-decoration-none"
                                        style={{ color: star <= reviewRating ? "#f0ad00" : "#adb5bd", fontSize: "1.6rem" }}
                                        onClick={() => setReviewRating(star)}
                                        aria-label={star + " star" + (star === 1 ? "" : "s")}
                                        aria-pressed={reviewRating === star}
                                    >
                                        <i className={star <= reviewRating ? "bi bi-star-fill" : "bi bi-star"}></i>
                                    </button>
                                ))}
                                <span className="small text-muted ms-1">{reviewRating}/5</span>
                            </div>
                            <label htmlFor="customer-review-comment" className="form-label fw-semibold">Your review</label>
                            <textarea
                                id="customer-review-comment"
                                className="form-control mb-3"
                                value={reviewComment}
                                onChange={(event) => setReviewComment(event.target.value)}
                                minLength={3}
                                maxLength={2000}
                                rows={3}
                                required
                                placeholder="Share your experience with this item..."
                            />
                            <ReviewPhotoPicker
                                id="package-review-photos"
                                files={reviewPhotos}
                                onFilesChange={setReviewPhotos}
                                existingImages={userReview?.images ?? []}
                                removedImages={removeReviewPhotos}
                                onRemovedImagesChange={setRemoveReviewPhotos}
                                maxPhotos={5}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary fw-semibold"
                                disabled={reviewSubmitting || reviewComment.trim().length < 3}
                            >
                                {reviewSubmitting ? "Saving review..." : (userReview ? "Update review" : "Submit review")}
                            </button>
                        </form>
                    </div>
                )}

                <section className="mt-4" id="reviews">

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
                                    {review.images?.length > 0 && (
                                        <div className="d-flex flex-wrap gap-2 mt-3">
                                            {review.images.map((image, index) => (
                                                <a key={image} href={reviewPhotoUrl(image)} target="_blank" rel="noreferrer" className="review-photo-link">
                                                    <img src={reviewPhotoUrl(image)} alt={"Customer review photo " + (index + 1)} loading="lazy" className="review-public-photo" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

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