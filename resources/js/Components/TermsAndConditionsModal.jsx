import { useEffect, useRef, useState } from "react";

export default function TermsAndConditionsModal({ onClose, onAccept }) {
    const contentRef = useRef(null);
    const [readComplete, setReadComplete] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    const checkReadComplete = () => {
        const element = contentRef.current;

        if (!element) {
            return;
        }

        const reachedBottom =
            element.scrollTop + element.clientHeight >= element.scrollHeight - 8;

        if (reachedBottom) {
            setReadComplete(true);
        }
    };

    useEffect(() => {
        checkReadComplete();
    }, []);

    const handleAccept = () => {
        if (!readComplete || !acknowledged) {
            return;
        }

        onAccept();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                fontFamily: "Outfit, sans-serif",
            }}
        >
            <div
                className="bg-white rounded-3 shadow"
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: "760px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid #dee2e6",
                }}
            >
                <div className="d-flex align-items-center justify-content-between border-bottom px-4 py-3">
                    <div>
                        <h2
                            id="terms-title"
                            className="mb-1 fw-bold"
                            style={{
                                fontFamily: "Outfit, sans-serif",
                                fontSize: "1.25rem",
                                letterSpacing: "0.01em",
                            }}
                        >
                            TERMS AND CONDITIONS
                        </h2>

                        <div className="text-muted small">
                            Version 1.0
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-light border"
                        onClick={onClose}
                        aria-label="Close Terms and Conditions"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div
                    ref={contentRef}
                    onScroll={checkReadComplete}
                    className="px-4 py-3"
                    style={{
                        overflowY: "auto",
                        minHeight: "260px",
                        lineHeight: 1.65,
                        fontSize: "0.9rem",
                    }}
                >
                    <p className="mb-3">
                        Please read these Terms and Conditions carefully before
                        creating a SecureView account and using our products and
                        services.
                    </p>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">1. Acceptance of Terms</h3>
                        <p className="mb-0">
                            By creating a SecureView account, placing an order,
                            or requesting a service, you agree to follow these
                            Terms and Conditions. You must read the terms and
                            provide your acceptance before completing
                            registration.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">2. Account Information</h3>
                        <p className="mb-0">
                            You are responsible for providing accurate and
                            up-to-date account information and for keeping your
                            login credentials secure. Do not use another
                            person's account without permission.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">3. Products, Prices, and Stock</h3>
                        <p className="mb-0">
                            Product and package prices, specifications, and
                            availability may change. An order is subject to
                            product availability and successful payment or
                            approved payment arrangements.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">4. Orders and Payments</h3>
                        <p className="mb-0">
                            Customers must provide correct order and delivery
                            information. Online payments are processed through
                            the available payment gateway. An order may remain
                            pending until payment and order details are
                            successfully confirmed.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">5. Delivery and Installation</h3>
                        <p className="mb-0">
                            Delivery and installation schedules depend on
                            location, availability, technician schedules, and
                            other service conditions. Customers must provide
                            accurate location and contact information and
                            cooperate with scheduled service visits.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">6. Service Requests</h3>
                        <p className="mb-0">
                            Service requests such as installation, inspection,
                            maintenance, repair, and consultation are subject
                            to review, scheduling, and technician availability.
                            SecureView may contact the customer when additional
                            information is needed.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">7. Customer Responsibilities</h3>
                        <p className="mb-0">
                            Customers agree to provide truthful information,
                            use the platform lawfully, and avoid actions that
                            may disrupt the service, damage equipment, or
                            interfere with other users.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">8. Changes to These Terms</h3>
                        <p className="mb-0">
                            SecureView may update these Terms and Conditions when
                            necessary. A new version may require users to review
                            and accept the updated terms before continuing to
                            use affected features.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">9. Contact and Support</h3>
                        <p className="mb-0">
                            For questions about an order, service request, or
                            these Terms and Conditions, contact SecureView
                            through the available support channels on the
                            website.
                        </p>
                    </section>

                    <div className="border-top pt-3 mt-4">
                        <strong>End of Terms and Conditions</strong>
                        <div className="text-muted small mt-1">
                            You must reach the end of this section before the
                            acknowledgement checkbox can be selected.
                        </div>
                    </div>
                </div>

                <div className="border-top px-4 py-3">
                    <div className="form-check mb-3">
                        <input
                            id="terms-modal-acknowledgement"
                            className="form-check-input"
                            type="checkbox"
                            checked={acknowledged}
                            disabled={!readComplete}
                            onChange={(event) =>
                                setAcknowledged(event.target.checked)
                            }
                        />

                        <label
                            htmlFor="terms-modal-acknowledgement"
                            className="form-check-label"
                            style={{ fontSize: "0.9rem" }}
                        >
                            I have read and understood the Terms and Conditions.
                        </label>
                    </div>

                    {!readComplete && (
                        <div className="text-muted small mb-3">
                            <i className="bi bi-arrow-down me-1"></i>
                            Scroll to the bottom of the Terms and Conditions to
                            continue.
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={onClose}
                        >
                            CLOSE
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary fw-bold"
                            disabled={!readComplete || !acknowledged}
                            onClick={handleAccept}
                        >
                            ACCEPT TERMS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
