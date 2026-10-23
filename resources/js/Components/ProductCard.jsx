import React, { useState } from "react";
import catalogImageUrl from "./catalogImageUrl";

export default function ProductCard({
    name,
    brand = "",
    image,
    price,
    badge,
    specifications = [],
    inclusions = [],
    rating = 0,
    reviewsCount = 0,
    available = true,
    onDetails,
    variant = "product",
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [failedImageUrl, setFailedImageUrl] = useState("");

    const safeSpecifications = Array.isArray(specifications) ? specifications.filter(Boolean) : [];
    const safeInclusions = Array.isArray(inclusions) ? inclusions.filter((item) => item && item.name) : [];
    const isPackage = variant === "package";
    const imageHeight = isPackage ? "214px" : "188px";
    const imageUrl = catalogImageUrl(image);
    const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
    const ratingValue = Number.isFinite(Number(rating)) ? Math.max(0, Math.min(5, Number(rating))) : 0;
    const totalReviews = Number.isFinite(Number(reviewsCount)) ? Math.max(0, Number(reviewsCount)) : 0;
    const visibleSpecifications = safeSpecifications.slice(0, 3);
    const visibleInclusions = safeInclusions.slice(0, 3);

    const cardStyle = {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid var(--sv-catalog-card-border)",
        borderRadius: "18px",
        overflow: "hidden",
        background: "var(--sv-catalog-card-bg)",
        color: "var(--sv-catalog-card-text)",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered ? "0 16px 34px rgba(19, 43, 79, 0.13)" : "0 4px 14px rgba(19, 43, 79, 0.045)",
        opacity: available ? 1 : 0.74,
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
    };

    const imageFallback = (
        <div
            className="secureview-catalog-card-image-fallback d-flex flex-column align-items-center justify-content-center gap-2"
            role="img"
            aria-label={name + " image unavailable"}
            style={{ height: "100%", width: "100%" }}
        >
            <i className={isPackage ? "bi bi-box-seam" : "bi bi-camera-video"} style={{ fontSize: "2.6rem" }} />
            <span className="small">Image unavailable</span>
        </div>
    );

    return (
        <div className="card secureview-catalog-card" style={cardStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="position-relative" style={{ padding: "12px 12px 0" }}>
                <div
                    className="position-relative overflow-hidden rounded-3 secureview-catalog-card-image-frame"
                    style={{ height: imageHeight }}
                >
                    {showImage ? (
                        <img
                            src={imageUrl}
                            alt={name}
                            className="w-100 h-100 secureview-catalog-card-image"
                            loading="lazy"
                            onError={() => setFailedImageUrl(imageUrl)}
                            style={{
                                objectFit: "contain",
                                objectPosition: "center",
                                padding: "15px",
                                backgroundColor: "transparent",
                            }}
                        />
                    ) : imageFallback}
                </div>

                {badge && available && (
                    <span
                        className="position-absolute top-0 end-0 badge text-primary border m-3 px-3 py-2"
                        style={{ backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#dbe7fb", borderRadius: "999px", fontWeight: 700 }}
                    >
                        {badge}
                    </span>
                )}

                {!available && (
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: "rgba(246,248,251,0.54)", paddingTop: "12px" }}
                    >
                        <span className="badge bg-secondary px-3 py-2" style={{ borderRadius: "999px" }}>OUT OF STOCK</span>
                    </div>
                )}
            </div>

            <div className="card-body d-flex flex-column" style={{ flex: 1, padding: "16px 17px 17px", fontFamily: "Outfit, sans-serif" }}>
                {String(brand ?? "").trim() && (
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{ width: "23px", height: "23px", borderRadius: "7px", background: "var(--sv-catalog-brand-icon-bg)", color: "var(--sv-catalog-brand-icon-color)", fontSize: "0.8rem" }}
                            aria-hidden="true"
                        >
                            <i className="bi bi-patch-check-fill" />
                        </span>
                        <span className="text-uppercase fw-bold secureview-catalog-card-brand" style={{ color: "var(--sv-catalog-card-muted)", fontSize: "0.73rem", letterSpacing: "0.09em" }}>
                            {String(brand).trim()}
                        </span>
                    </div>
                )}

                <h5
                    className="card-title fw-bold mb-2 secureview-catalog-card-title"
                    style={{
                        fontSize: isPackage ? "1.12rem" : "1.04rem",
                        lineHeight: "1.35",
                        minHeight: "2.7em",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        color: "var(--sv-catalog-card-text)",
                    }}
                >
                    {name}
                </h5>

                {visibleSpecifications.length > 0 && (
                    <ul className="ps-3 mb-3 secureview-catalog-card-specifications" style={{ fontSize: "0.86rem", lineHeight: "1.48", color: "var(--sv-catalog-card-copy)", overflowWrap: "anywhere" }}>
                        {visibleSpecifications.map((specification, index) => (
                            <li key={index} className="mb-1">{specification}</li>
                        ))}
                    </ul>
                )}
                {safeSpecifications.length > visibleSpecifications.length && (
                    <div className="small mb-3" style={{ color: "var(--sv-catalog-card-muted)" }}>+{safeSpecifications.length - visibleSpecifications.length} more details</div>
                )}

                {isPackage && safeInclusions.length > 0 && (
                    <div className="mb-3 p-3 rounded-3" style={{ background: "var(--sv-catalog-card-subtle)", border: "1px solid var(--sv-catalog-card-border)" }}>
                        <div className="fw-bold text-uppercase mb-2" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "var(--sv-catalog-card-muted)" }}>
                            <i className="bi bi-box-seam me-1" /> Includes
                        </div>
                        <ul className="ps-3 mb-0 secureview-catalog-card-copy" style={{ fontSize: "0.82rem", lineHeight: "1.45", color: "var(--sv-catalog-card-copy)", overflowWrap: "anywhere" }}>
                            {visibleInclusions.map((item, index) => (
                                <li key={item.id ?? (item.name + "-" + index)} className="mb-1">
                                    {item.name}{Number(item.quantity) > 1 ? " × " + Number(item.quantity) : ""}
                                </li>
                            ))}
                        </ul>
                        {safeInclusions.length > visibleInclusions.length && (
                            <div className="small mt-1" style={{ color: "var(--sv-catalog-card-muted)" }}>+{safeInclusions.length - visibleInclusions.length} more included item(s)</div>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-2">
                    <div className="d-flex justify-content-between align-items-end gap-3 mb-3">
                        <div className="min-w-0">
                            <div className="small text-muted mb-1" style={{ fontSize: "0.72rem", letterSpacing: "0.06em" }}>PRICE</div>
                            <div className="fw-bold text-primary text-nowrap" style={{ fontSize: isPackage ? "1.5rem" : "1.42rem", lineHeight: 1.1 }}>
                                ₱{Number(price || 0).toLocaleString("en-PH")}
                            </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                            <div className="d-flex align-items-center justify-content-end gap-1 mb-1" aria-label={"Rating " + ratingValue.toFixed(1) + " out of 5"}>
                                <span className="text-warning d-inline-flex gap-0" aria-hidden="true">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <i key={star} className={star <= Math.round(ratingValue) ? "bi bi-star-fill" : "bi bi-star"} />
                                    ))}
                                </span>
                                <span className="fw-bold text-dark small">{ratingValue.toFixed(1)}</span>
                            </div>
                            <div className="small text-muted" style={{ fontSize: "0.75rem" }} aria-label={totalReviews + " total reviews"}>
                                {totalReviews.toLocaleString("en-PH")} {totalReviews === 1 ? "review" : "reviews"}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary fw-bold w-100 py-2"
                        style={{ borderRadius: "10px", letterSpacing: "0.02em", boxShadow: "0 4px 10px rgba(13, 110, 253, 0.15)" }}
                        onClick={onDetails}
                        disabled={!available}
                    >
                        {available ? "VIEW DETAILS" : "UNAVAILABLE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
