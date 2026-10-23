import React, { useState } from "react";
import catalogImageUrl from "./catalogImageUrl";

export default function ProductCard({
    name,
    image,
    price,
    badge,
    specifications = [],
    inclusions = [],
    rating = 0,
    available = true,
    onDetails,
    variant = "product",
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [failedImageUrl, setFailedImageUrl] = useState("");

    const safeSpecifications = Array.isArray(specifications) ? specifications.filter(Boolean) : [];
    const safeInclusions = Array.isArray(inclusions) ? inclusions.filter((item) => item && item.name) : [];
    const isPackage = variant === "package";
    const imageHeight = isPackage ? "220px" : "180px";
    const imageUrl = catalogImageUrl(image);
    const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

    const cardStyle = {
        height: "100%",
        border: "1px solid #dee2e6",
        borderRadius: "0.5rem",
        overflow: "hidden",
        transform: isHovered && available ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered && available ? "0 8px 20px rgba(0, 0, 0, 0.10)" : "none",
        opacity: available ? 1 : 0.72,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
    };

    const imageFallback = (
        <div
            className="bg-secondary-subtle d-flex flex-column align-items-center justify-content-center gap-2 text-secondary"
            role="img"
            aria-label={name + " image unavailable"}
            style={{ height: imageHeight, width: "100%" }}
        >
            <i className={isPackage ? "bi bi-box-seam" : "bi bi-camera-video"} style={{ fontSize: "2.8rem" }} />
            <span className="small">Image unavailable</span>
        </div>
    );

    return (
        <div className="card" style={cardStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="position-relative p-2">
                {showImage ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-100 rounded-2"
                        loading="lazy"
                        onError={() => setFailedImageUrl(imageUrl)}
                        style={{
                            height: imageHeight,
                            objectFit: "contain",
                            objectPosition: "center",
                            padding: "6px",
                            backgroundColor: "#f8f9fa",
                        }}
                    />
                ) : imageFallback}

                {badge && available && (
                    <span className="position-absolute top-0 end-0 badge bg-primary m-3">{badge}</span>
                )}

                {!available && (
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                    >
                        <span className="badge bg-secondary px-3 py-2">OUT OF STOCK</span>
                    </div>
                )}
            </div>

            <div className="card-body d-flex flex-column" style={{ padding: isPackage ? "0.75rem 1rem 1rem" : "0.5rem 0.85rem 0.85rem", fontFamily: "Outfit, sans-serif" }}>
                <h5 className="card-title fw-bold mb-2" style={{ fontSize: isPackage ? "1.2rem" : "1.1rem", lineHeight: "1.3" }}>
                    {name}
                </h5>

                {safeSpecifications.length > 0 && (
                    <ul className="ps-3 mb-3" style={{ fontSize: "0.9rem", lineHeight: "1.5", overflowWrap: "anywhere" }}>
                        {safeSpecifications.map((specification, index) => (
                            <li key={index} className="mb-1">{specification}</li>
                        ))}
                    </ul>
                )}

                {isPackage && safeInclusions.length > 0 && (
                    <div className="mb-3">
                        <div className="fw-bold text-uppercase mb-1" style={{ fontSize: "0.82rem", letterSpacing: "0.03em" }}>
                            Includes
                        </div>
                        <ul className="ps-3 mb-0" style={{ fontSize: "0.88rem", lineHeight: "1.45", maxHeight: "140px", overflowY: "auto", overflowWrap: "anywhere" }}>
                            {safeInclusions.map((item, index) => (
                                <li key={item.id ?? (item.name + "-" + index)} className="mb-1">
                                    {item.name}
                                    {Number(item.quantity) > 1 ? " × " + Number(item.quantity) : ""}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                        <h4 className="fw-bold text-primary mb-0 text-nowrap" style={{ fontSize: isPackage ? "1.5rem" : "1.4rem" }}>
                            ₱{Number(price).toLocaleString()}
                        </h4>
                        <div className="d-flex align-items-center gap-1 text-warning fw-semibold flex-shrink-0" style={{ fontSize: "0.9rem" }} aria-label={"Rating " + Number(rating).toFixed(1) + " out of 5"}>
                            <span>{Number(rating).toFixed(1)}</span>
                            <span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <i key={star} className={star <= Math.round(Number(rating)) ? "bi bi-star-fill" : "bi bi-star"} />
                                ))}
                            </span>
                        </div>
                    </div>
                    <button type="button" className="btn btn-primary fw-bold w-100" onClick={onDetails} disabled={!available}>
                        {available ? "DETAILS" : "UNAVAILABLE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
