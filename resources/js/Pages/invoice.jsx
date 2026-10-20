import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link } from "@inertiajs/react";

function peso(value) {
    return Number(value ?? 0).toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function humanize(value) {
    return String(value ?? "").replaceAll("_", " ");
}

function methodLabel(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    if (method === "cash") return "Cash";
    return method || "Not specified";
}

function businessTaxStatus(status) {
    if (status === "vat") return "VAT-registered";
    if (status === "non_vat") return "Non-VAT registered";
    return "";
}

export default function Invoice({ invoice }) {
    const business = invoice.business ?? {};
    const hasRegistrationDetails = Boolean(
        business.registered_name &&
        business.address &&
        business.tin &&
        business.vat_status &&
        business.vat_status !== "not_configured" &&
        business.bir_permit_number &&
        business.bir_atp_number &&
        business.serial_number_range
    );

    return (
        <div className="invoice-page bg-light min-vh-100">
            <style>{`
                .invoice-sheet {
                    max-width: 920px;
                    margin: 0 auto;
                    background: #fff;
                    color: #20252b;
                    border: 1px solid #dee2e6;
                    border-radius: 16px;
                    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.06);
                    padding: 42px;
                }
                .invoice-masthead {
                    border-bottom: 2px solid #1d4ed8;
                    padding-bottom: 24px;
                }
                .invoice-meta {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 16px;
                }
                .invoice-table th {
                    background: #f1f5f9;
                    color: #334155;
                    font-size: 12px;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }
                .invoice-table td, .invoice-table th {
                    padding: 12px 10px;
                    vertical-align: top;
                }
                .invoice-total-row {
                    border-top: 2px solid #1d4ed8;
                    font-size: 1.15rem;
                }
                .invoice-disclaimer {
                    border-top: 1px dashed #cbd5e1;
                    margin-top: 28px;
                    padding-top: 16px;
                    color: #64748b;
                    font-size: 12px;
                }
                @media print {
                    @page { size: A4; margin: 12mm; }
                    html, body, #app, .invoice-page {
                        background: #fff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .invoice-sheet {
                        max-width: none !important;
                        width: 100% !important;
                        padding: 0 !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }
                    .invoice-table { page-break-inside: auto; }
                    .invoice-table tr { page-break-inside: avoid; page-break-after: auto; }
                    a { color: inherit !important; text-decoration: none !important; }
                    .invoice-print-note { display: block !important; }
                }
            `}</style>

            <div className="no-print">
                <Navbar />
            </div>

            <main className="container py-4 py-md-5">
                <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4 no-print">
                    <div>
                        <div className="small text-uppercase fw-bold text-primary mb-1">SecureView</div>
                        <h1 className="h3 fw-bold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                            INVOICE
                        </h1>
                        <div className="text-muted small">
                            Reference {invoice.reference_number}
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <Link
                            href={invoice.viewer_role === "admin"
                                ? "/admin/purchases"
                                : "/purchases/" + invoice.order_id}
                            className="btn btn-outline-primary fw-semibold"
                        >
                            BACK
                        </Link>
                        <button type="button" className="btn btn-primary fw-bold" onClick={() => window.print()}>
                            <i className="bi bi-printer me-2"></i>PRINT / SAVE PDF
                        </button>
                    </div>
                </div>

                {!hasRegistrationDetails && (
                    <div className="alert alert-warning no-print" role="status">
                        <strong>Invoice preview:</strong> business registration and BIR-authorized invoice details are not fully configured.
                        This printout is an internal order document, not a representation of a BIR-registered tax invoice.
                    </div>
                )}

                <article className="invoice-sheet">
                    <div className="invoice-masthead d-flex flex-column flex-md-row justify-content-between gap-4">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{ width: 46, height: 46, fontFamily: "Outfit, sans-serif", fontSize: 20 }}>
                                    SV
                                </div>
                                <div>
                                    <div className="h4 fw-bold mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                                        {business.name || "SecureView"}
                                    </div>
                                    <div className="text-muted small">ORDER INVOICE</div>
                                </div>
                            </div>
                            {business.registered_name && <div className="fw-semibold">{business.registered_name}</div>}
                            {business.address && <div className="small text-muted mt-1" style={{ whiteSpace: "pre-line" }}>{business.address}</div>}
                            {business.phone && <div className="small text-muted mt-1">{business.phone}</div>}
                            {business.email && <div className="small text-muted">{business.email}</div>}
                            {business.tin && <div className="small text-muted mt-1">TIN: {business.tin}</div>}
                            {business.vat_status && business.vat_status !== "not_configured" && (
                                <div className="small text-muted">{businessTaxStatus(business.vat_status)}{business.branch_code ? " · Branch " + business.branch_code : ""}</div>
                            )}
                        </div>

                        <div className="text-md-end">
                            <div className="display-6 fw-bold text-primary" style={{ letterSpacing: ".04em" }}>INVOICE</div>
                            <div className="fw-semibold mt-1">{invoice.reference_number}</div>
                            <div className="small text-muted mt-1">Order placed: {invoice.document_date || "—"}</div>
                            <span className={"badge rounded-pill mt-3 px-3 py-2 " + (invoice.is_paid ? "text-bg-success" : "text-bg-warning")}>
                                {invoice.is_paid ? "PAID" : "PAYMENT " + humanize(invoice.payment_status).toUpperCase()}
                            </span>
                            {invoice.is_paid && invoice.payment_date && (
                                <div className="small text-muted mt-2">Payment received: {invoice.payment_date}</div>
                            )}
                        </div>
                    </div>

                    <div className="row g-3 my-4">
                        <div className="col-md-7">
                            <div className="small text-uppercase text-muted fw-bold mb-2">Bill to</div>
                            <div className="fw-bold fs-5">{invoice.customer.name || "Customer"}</div>
                            {invoice.customer.address && <div className="text-muted mt-1" style={{ whiteSpace: "pre-line" }}>{invoice.customer.address}</div>}
                            {invoice.customer.email && <div className="text-muted small mt-1">{invoice.customer.email}</div>}
                            {invoice.customer.phone && <div className="text-muted small">{invoice.customer.phone}</div>}
                        </div>
                        <div className="col-md-5">
                            <div className="invoice-meta">
                                <div className="small text-uppercase text-muted fw-bold mb-3">Order details</div>
                                <div className="d-flex justify-content-between gap-3 mb-2">
                                    <span className="text-muted">Order reference</span>
                                    <span className="fw-semibold text-end">{invoice.reference_number}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3 mb-2">
                                    <span className="text-muted">Payment method</span>
                                    <span className="fw-semibold text-end">{methodLabel(invoice.payment_method)}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-muted">Order status</span>
                                    <span className="fw-semibold text-end text-capitalize">{humanize(invoice.order_status)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table invoice-table align-middle">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th className="text-end">Qty</th>
                                    <th className="text-end">Unit price</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="fw-semibold">{item.name}</td>
                                        <td className="text-end">{item.quantity}</td>
                                        <td className="text-end text-nowrap">{peso(item.unit_price)}</td>
                                        <td className="text-end text-nowrap">{peso(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="row justify-content-end mt-4">
                        <div className="col-sm-8 col-md-6 col-lg-5">
                            <div className="d-flex justify-content-between py-2">
                                <span className="text-muted">Items subtotal</span>
                                <span>{peso(invoice.subtotal)}</span>
                            </div>
                            {Number(invoice.installation_fee) > 0 && (
                                <div className="d-flex justify-content-between py-2">
                                    <span className="text-muted">Installation fee</span>
                                    <span>{peso(invoice.installation_fee)}</span>
                                </div>
                            )}
                            <div className="d-flex justify-content-between py-2">
                                <span className="text-muted">Shipping</span>
                                <span>{peso(invoice.shipping_fee)}</span>
                            </div>
                            <div className="invoice-total-row d-flex justify-content-between gap-3 py-3 fw-bold">
                                <span>Total</span>
                                <span className="text-nowrap">{peso(invoice.total)}</span>
                            </div>
                            <div className="d-flex justify-content-between py-2">
                                <span className="text-muted">Amount paid</span>
                                <span>{peso(invoice.amount_paid)}</span>
                            </div>
                            <div className="d-flex justify-content-between py-2 fw-bold">
                                <span>Balance due</span>
                                <span className={invoice.balance_due > 0 ? "text-danger" : "text-success"}>
                                    {peso(invoice.balance_due)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="invoice-disclaimer">
                        <div className="fw-semibold mb-1">SecureView order document</div>
                        This document is generated from the order and payment records stored in SecureView. It is not represented as a BIR-registered tax invoice.
                        No VAT, withholding tax, or other tax amount is calculated by this document. Confirm the business's registration, authorized serial numbering,
                        required invoice information, and applicable electronic-invoicing obligations with your accountant before using an invoice for tax purposes.
                    </div>
                    <div className="small text-muted mt-3 invoice-print-note">
                        Generated {invoice.generated_at}
                    </div>
                </article>
            </main>

            <div className="no-print">
                <Footer />
            </div>
        </div>
    );
}
