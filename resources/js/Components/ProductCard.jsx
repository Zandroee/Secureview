import React, { useState } from "react";

export default function ProductCard({ name, image, price, badge, specifications = [], onDetails, variant = "product" }) {
    const [isHovered, setIsHovered] = useState(false);

    const isPackage = variant === "package";
    const imageHeight = isPackage ? "220px" : "180px";

    const cardStyle = {
        height: "100%",
        border: "1px solid #dee2e6",
        borderRadius: "0.375rem",
        overflow: "hidden",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered ? "0 8px 20px rgba(0, 0, 0, 0.10)" : "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
    };

    return (
        <div className="card" style={cardStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>

            {/* IMAGE */}

            <div className="position-relative p-2">

                {image ? (
                    <img src={image} alt={name} className="w-100" style={{ height: imageHeight, objectFit: "cover" }} />
                ) : (
                    <div className="bg-secondary-subtle d-flex align-items-center justify-content-center" style={{ height: imageHeight }}>
                        <i className="bi bi-camera-video text-secondary" style={{ fontSize: isPackage ? "3rem" : "2.5rem" }}></i>
                    </div>
                )}

                {/* BADGE */}

                {badge && (
                    <span className="position-absolute top-0 end-0 badge bg-primary m-3">
                        {badge}
                    </span>
                )}

            </div>

            {/* CONTENT */}

            <div className="card-body d-flex flex-column" style={{ padding: isPackage ? "0.5rem 1rem 1rem" : "0.25rem 0.75rem 0.75rem", fontFamily: "Outfit, sans-serif" }}>

                {/* NAME */}

                <h5 className="card-title fw-bold mb-2" style={{ fontSize: isPackage ? "1.05rem" : "1rem" }}>
                    {name}
                </h5>

                {/* SPECIFICATIONS */}

                <ul className="ps-3 mb-3" style={{ fontSize: isPackage ? "0.78rem" : "0.72rem", lineHeight: isPackage ? "1.55" : "1.5" }}>
                    {specifications.map((specification, index) => (
                        <li key={index} className="mb-1">
                            {specification}
                        </li>
                    ))}
                </ul>

                {/* PRICE + BUTTON */}

                <div className="mt-auto">

                    <h4 className="fw-bold text-primary mb-3" style={{ fontSize: isPackage ? "1.5rem" : "1.35rem" }}>
                        ₱{Number(price).toLocaleString()}
                    </h4>

                    <button type="button" className="btn btn-primary fw-bold w-100" onClick={onDetails}>
                        DETAILS
                    </button>

                </div>

            </div>

        </div>
    );
}