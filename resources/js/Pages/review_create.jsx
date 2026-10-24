import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import ReviewPhotoPicker, { reviewPhotoUrl } from "../Components/ReviewPhotoPicker";
import { Link, useForm, usePage } from "@inertiajs/react";
import { useMemo } from "react";

function Stars({ rating }) {
    return (
        <span className="text-warning" aria-label={rating + " out of 5 stars"}>
            {[1, 2, 3, 4, 5].map((star) => (
                <i key={star} className={star <= Number(rating) ? "bi bi-star-fill" : "bi bi-star"} aria-hidden="true" />
            ))}
        </span>
    );
}

export default function ReviewCreate({ order, orderItem, item, itemType, userReview = null, reviews = [] }) {
    const { props } = usePage();
    const initialImages = useMemo(() => userReview?.images ?? [], [userReview?.id, userReview?.images]);
    const { data, setData, post, processing, errors } = useForm({
        item_type: itemType,
        item_id: item.id,
        rating: Number(userReview?.rating ?? 5),
        comment: userReview?.comment ?? "",
        images: [],
        remove_images: [],
    });

    const submitReview = (event) => {
        event.preventDefault();
        post("/reviews", {
            preserveScroll: true,
            onSuccess: () => {
                setData("images", []);
                setData("remove_images", []);
            },
        });
    };

    return (
        <div className="review-create-page">
            <Navbar />
            <main className="py-4 py-md-5" style={{ minHeight: "70vh" }}>
                <div className="container" style={{ maxWidth: "980px" }}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div>
                            <div className="small text-uppercase fw-bold text-primary mb-1">SecureView · Order review</div>
                            <h1 className="h2 fw-bold mb-1">Review &amp; Rating</h1>
                            <p className="text-muted mb-0">Order {order.order_number}</p>
                        </div>
                        <Link href={"/purchases/" + order.id} className="btn btn-outline-primary fw-semibold">
                            <i className="bi bi-arrow-left me-2" />Back to order
                        </Link>
                    </div>

                    {props.flash?.success && <div className="alert alert-success" role="status">{props.flash.success}</div>}
                    {errors.review && <div className="alert alert-danger" role="alert">{errors.review}</div>}

                    <div className="row g-4 align-items-start">
                        <div className="col-lg-5">
                            <section className="review-create-panel border rounded-4 p-3 p-md-4 h-100">
                                <div className="d-flex gap-3 align-items-start">
                                    {item.image ? (
                                        <img src={reviewPhotoUrl(item.image)} alt={item.name} className="review-create-item-image rounded-3 border" />
                                    ) : (
                                        <div className="review-create-item-image rounded-3 border d-flex align-items-center justify-content-center">
                                            <i className={"bi " + (itemType === "package" ? "bi-box-seam" : "bi-camera-video")} />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <span className="badge rounded-pill bg-primary-subtle text-primary text-uppercase">{item.type}</span>
                                        <h2 className="h5 fw-bold mt-2 mb-2" style={{ overflowWrap: "anywhere" }}>{item.name}</h2>
                                        <div className="fw-bold text-primary">₱{Number(item.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <div className="small text-muted mt-2">Order item #{orderItem.id}</div>
                                        {item.warranty_period && <div className="small text-muted mt-1">Warranty: {item.warranty_period}</div>}
                                    </div>
                                </div>

                                <hr className="my-4" />
                                <h3 className="h6 fw-bold">Customer reviews</h3>
                                <p className="small text-muted mb-3">Your rating helps other customers understand how this product or package performs.</p>
                                <div className="d-flex align-items-center gap-2">
                                    <Stars rating={reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0} />
                                    <span className="small text-muted">{reviews.length} review{reviews.length === 1 ? "" : "s"} on this item</span>
                                </div>
                            </section>
                        </div>

                        <div className="col-lg-7">
                            <section className="review-create-panel border rounded-4 p-3 p-md-4">
                                <h2 className="h4 fw-bold mb-1">{userReview ? "Update your review" : "Share your experience"}</h2>
                                <p className="small text-muted mb-4">You can submit one review per product or package, and update it later.</p>

                                <form onSubmit={submitReview}>
                                    <label className="form-label fw-semibold">Your rating</label>
                                    <div className="d-flex align-items-center gap-2 mb-4" role="group" aria-label="Choose a rating from one to five stars">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                className="btn btn-link p-0 text-decoration-none"
                                                style={{ color: star <= data.rating ? "#f0ad00" : "#94a3b8", fontSize: "1.8rem" }}
                                                onClick={() => setData("rating", star)}
                                                aria-label={star + " star" + (star === 1 ? "" : "s")}
                                                aria-pressed={data.rating === star}
                                            >
                                                <i className={star <= data.rating ? "bi bi-star-fill" : "bi bi-star"} />
                                            </button>
                                        ))}
                                        <span className="small text-muted ms-1">{data.rating}/5</span>
                                    </div>
                                    {errors.rating && <div className="text-danger small mb-3">{errors.rating}</div>}

                                    <label htmlFor="order-review-comment" className="form-label fw-semibold">Your review</label>
                                    <textarea
                                        id="order-review-comment"
                                        className={"form-control mb-2 " + (errors.comment ? "is-invalid" : "")}
                                        rows={5}
                                        minLength={3}
                                        maxLength={2000}
                                        required
                                        value={data.comment}
                                        onChange={(event) => setData("comment", event.target.value)}
                                        placeholder="Share your experience with this item..."
                                    />
                                    <div className="d-flex justify-content-between small text-muted mb-3">
                                        <span>{errors.comment || ""}</span>
                                        <span>{data.comment.length}/2000</span>
                                    </div>

                                    <ReviewPhotoPicker
                                        id="order-review-photos"
                                        files={data.images}
                                        onFilesChange={(files) => setData("images", files)}
                                        existingImages={initialImages}
                                        removedImages={data.remove_images}
                                        onRemovedImagesChange={(images) => setData("remove_images", images)}
                                        maxPhotos={5}
                                    />
                                    {errors.images && <div className="text-danger small mb-3">{errors.images}</div>}
                                    {errors["images.0"] && <div className="text-danger small mb-3">{errors["images.0"]}</div>}

                                    <button type="submit" className="btn btn-primary fw-bold w-100" disabled={processing || data.comment.trim().length < 3}>
                                        {processing ? "SAVING REVIEW..." : userReview ? "UPDATE REVIEW" : "SUBMIT REVIEW"}
                                    </button>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
