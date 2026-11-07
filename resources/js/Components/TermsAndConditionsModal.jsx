import { useEffect, useRef, useState } from "react";

export default function TermsAndConditionsModal({
    onClose,
    onAccept,
    initialNewsletterOptIn = false,
}) {
    const contentRef = useRef(null);
    const [readComplete, setReadComplete] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [newsletterOptIn, setNewsletterOptIn] = useState(
        Boolean(initialNewsletterOptIn)
    );

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

        onAccept({ newsletterOptIn });
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
                padding: "12px",
                overflowY: "auto",
                overscrollBehavior: "contain",
                fontFamily: "Outfit, sans-serif",
            }}
        >
            <div
                className="bg-white rounded-3 shadow"
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: "760px",
                    height: "min(90vh, 90dvh)",
                    maxHeight: "90dvh",
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
                            Version 2.0 · Updated November 7, 2026
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-link p-0 text-primary text-decoration-none fw-semibold"
                        onClick={onClose}
                        aria-label="Back from Terms and Conditions"
                        style={{
                            fontFamily: "Outfit, sans-serif",
                            fontSize: "0.9rem",
                        }}
                    >
                        Back
                    </button>
                </div>

                <div
                    ref={contentRef}
                    onScroll={checkReadComplete}
                    className="px-3 px-sm-4 py-3"
                    style={{
                        flex: "1 1 auto",
                        minHeight: 0,
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                        WebkitOverflowScrolling: "touch",
                        lineHeight: 1.65,
                        fontSize: "0.9rem",
                    }}
                >
                    <p className="mb-3">
                        Please read these Terms and Conditions before creating a
                        Netmax Trading account, placing an order, or requesting a
                        service. These terms explain how accounts, orders, services,
                        refund requests, and optional promotional emails are handled.
                    </p>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">1. Acceptance of Terms</h3>
                        <p className="mb-0">
                            By creating an account, placing an order, or requesting
                            a service, you agree to follow these Terms and Conditions.
                            You must read and accept the Terms before completing
                            account registration. The optional promotional email
                            preference below is separate from accepting these Terms
                            and is not required to create an account or use the site.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">2. Account Information and Security</h3>
                        <p className="mb-0">
                            You are responsible for providing accurate and up-to-date
                            account information and for keeping your login credentials
                            secure. Do not use another person's account without
                            permission. Keep your contact details current so that
                            Netmax Trading can send account, order, payment, and
                            service-related notices.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">3. Products, Prices, and Availability</h3>
                        <p className="mb-0">
                            Product and package prices, specifications, promotions,
                            and stock availability may change. Orders are subject
                            to availability and successful payment or an approved
                            payment arrangement. Any discount or voucher is subject
                            to its stated eligibility, validity period, and checkout
                            conditions.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">4. Orders and Payments</h3>
                        <p className="mb-0">
                            Customers must provide correct order, contact, and
                            delivery information. Online payments are processed
                            through the available payment provider. Cash orders
                            remain subject to the payment and confirmation steps
                            shown on the site. An order may remain pending until
                            payment and order details have been confirmed. Unpaid
                            orders may be cancelled when they meet the site's
                            published cancellation conditions.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">5. Delivery and Installation</h3>
                        <p className="mb-0">
                            Delivery and installation schedules depend on the
                            customer's location, product availability, technician
                            schedules, and other service conditions. Customers must
                            provide accurate location and contact information and
                            cooperate with confirmed delivery or service visits.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">6. Service Requests and Scheduling</h3>
                        <p className="mb-0">
                            Installation, inspection, maintenance, repair, and
                            consultation requests are subject to review, scheduling,
                            service-area coverage, and technician availability.
                            Preferred dates and time slots are requests until
                            confirmed by Netmax Trading. Customers may submit
                            rescheduling requests through the available account
                            features; a requested change is not final until approved.
                            Netmax Trading may contact the customer when additional
                            information is needed.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">7. Refund Requests and Processing</h3>
                        <p>
                            A customer may submit a full or partial refund request
                            for an eligible order whose payment has been confirmed.
                            The refund request must be submitted through the
                            customer's order details while the order has a refundable
                            balance. The amount requested cannot exceed the remaining
                            refundable balance after other pending, approved,
                            processing, or completed refunds have been taken into
                            account.
                        </p>
                        <p>
                            Submitting a request does not mean that the refund has
                            been approved or paid. Netmax Trading reviews customer
                            requests and may approve the requested amount, approve
                            a lower amount that does not exceed the request, or
                            reject the request with a reason. The customer can
                            follow the request and its status through the account.
                        </p>
                        <p>
                            Approved refunds are processed through PayMongo when
                            the original payment and provider details support that
                            method. Cash refunds and cases that cannot be completed
                            through the payment provider are handled manually.
                            A refund is marked complete only after the provider
                            confirms success or Netmax Trading records that the
                            money has actually been returned. Processing time can
                            vary by payment provider, bank, or wallet.
                        </p>
                        <p>
                            When Netmax Trading cancels an eligible paid order
                            before delivery, the system may initiate an automatic
                            refund for the remaining refundable order balance.
                            A delivered order is not covered by this automatic
                            cancellation path and must go through refund review.
                            When Netmax Trading cancels a paid service linked to
                            a product order, the automatic service refund is limited
                            to the applicable installation and service-priority
                            fees; the product portion of that order remains
                            unchanged. A fee-only service booking may be refunded
                            for its remaining refundable amount.
                        </p>
                        <p className="mb-0">
                            Refund status updates are available in the customer's
                            account. The final amount and completion status are
                            based on the approved refund record and confirmation
                            from the payment provider or the actual manual return.
                            These terms do not remove any rights a customer may
                            have under applicable consumer protection laws.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">8. Customer Responsibilities and Acceptable Use</h3>
                        <p className="mb-0">
                            Customers agree to provide truthful information, use
                            the platform lawfully, follow confirmed booking and
                            payment instructions, and avoid actions that may
                            disrupt the site, damage equipment, or interfere with
                            other users.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">9. Promotional Emails and Your Choice</h3>
                        <p className="mb-0">
                            Netmax Trading may send optional newsletters and
                            promotional emails about promotions, vouchers,
                            discounts, and special offers to customers who
                            expressly choose to receive them. This choice is
                            voluntary and is not a condition of registration,
                            ordering, or receiving services. You can change or
                            withdraw this preference at any time in Account
                            Settings. Choosing not to receive promotional emails
                            does not stop necessary account, verification,
                            payment, order, security, or service-related messages.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">10. Changes to These Terms</h3>
                        <p className="mb-0">
                            Netmax Trading may update these Terms and Conditions
                            when necessary. The displayed version and update date
                            identify the terms currently presented to customers.
                            A new version may require users to review and accept
                            the updated terms before continuing to use affected
                            features.
                        </p>
                    </section>

                    <section className="mb-4">
                        <h3 className="h6 fw-bold">11. Contact and Support</h3>
                        <p className="mb-0">
                            For questions about an order, refund request, service,
                            or these Terms and Conditions, contact Netmax Trading
                            through the customer support channels available on
                            the website.
                        </p>
                    </section>

                    <div className="border-top pt-3 mt-4">
                        <strong>End of Terms and Conditions</strong>
                        <div className="text-muted small mt-1">
                            You must reach the end of this section before the
                            acknowledgement and optional promotional email
                            preference can be confirmed.
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
                            onChange={(event) => setAcknowledged(event.target.checked)}
                        />

                        <label
                            htmlFor="terms-modal-acknowledgement"
                            className="form-check-label"
                            style={{ fontSize: "0.9rem" }}
                        >
                            I have read and understood the Terms and Conditions.
                        </label>
                    </div>

                    <div className="border rounded-3 p-3 mb-3">
                        <div className="d-flex align-items-start gap-2">
                            <input
                                id="terms-modal-newsletter-opt-in"
                                className="form-check-input mt-1"
                                type="checkbox"
                                checked={newsletterOptIn}
                                disabled={!readComplete}
                                onChange={(event) => setNewsletterOptIn(event.target.checked)}
                            />
                            <div>
                                <label
                                    htmlFor="terms-modal-newsletter-opt-in"
                                    className="form-check-label fw-semibold"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    Yes, I would like to receive Netmax Trading newsletters about promotions, vouchers, discounts, and special offers.
                                </label>
                                <div className="text-muted small mt-1">
                                    Optional. This is separate from accepting the Terms. You can unsubscribe at any time in Account Settings.
                                </div>
                            </div>
                        </div>
                    </div>

                    {!readComplete && (
                        <div className="text-muted small mb-3">
                            <i className="bi bi-arrow-down me-1"></i>
                            Scroll to the bottom of the Terms and Conditions to continue.
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary fw-bold"
                            onClick={onClose}
                            style={{ fontFamily: "Outfit, sans-serif" }}
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
