import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

const emptyForm = {
    business_name: "",
    registered_name: "",
    address: "",
    email: "",
    phone: "",
    tin: "",
    vat_status: "not_configured",
    branch_code: "",
    bir_permit_number: "",
    bir_atp_number: "",
    serial_number_range: "",
    invoice_number_prefix: "",
    first_invoice_number: "",
    last_invoice_number: "",
    invoice_number_padding: 6,
    pti_einvoice_number: "",
    eis_certification_reference: "",
};

function TextField({ label, name, value, onChange, error, type = "text", help }) {
    return (
        <div className="mb-3">
            <label htmlFor={name} className="form-label fw-semibold">{label}</label>
            <input
                id={name}
                name={name}
                type={type}
                value={value ?? ""}
                onChange={(event) => onChange(name, event.target.value)}
                className={"form-control" + (error ? " is-invalid" : "")}
            />
            {help && <div className="form-text">{help}</div>}
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
}

export default function InvoiceSettings({ settings = {}, profile_ready: profileReady = false, series_ready: seriesReady = false }) {
    const { props } = usePage();
    const [form, setForm] = useState({ ...emptyForm, ...settings });
    const [saving, setSaving] = useState(false);
    const errors = props.errors ?? {};
    const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const submit = (event) => {
        event.preventDefault();
        setSaving(true);
        router.patch("/admin/invoice-settings", form, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid py-4" style={{ fontFamily: "Outfit, sans-serif", background: "#f7f7f8", minHeight: "70vh" }}>
                <div className="row g-0">
                    <div className="col-lg-3 col-xl-2 mb-4 mb-lg-0">
                        <Sidebar active="invoice-settings" />
                    </div>
                    <main className="col-lg-9 col-xl-10 px-3 px-lg-4">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold text-uppercase">Finance configuration</div>
                                <h1 className="fw-bold mb-1">INVOICE SETTINGS</h1>
                                <p className="text-muted mb-0">Enter the seller's registered details and the invoice serial series approved for this business.</p>
                            </div>
                            <button className="btn btn-primary fw-bold" type="submit" form="invoice-settings-form" disabled={saving}>
                                {saving ? "SAVING..." : "SAVE SETTINGS"}
                            </button>
                        </div>

                        {props.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}
                        <div className="alert alert-warning">
                            These settings prepare the invoice profile only. They do not register SecureView with the BIR, authorize a serial-number series, calculate taxes, or enable BIR electronic transmission. Enter only details confirmed by the business's registration documents and accountant.
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body d-flex gap-3 align-items-start">
                                        <i className={"bi " + (profileReady ? "bi-check-circle-fill text-success" : "bi-exclamation-circle text-warning")} style={{ fontSize: "1.5rem" }} />
                                        <div>
                                            <div className="fw-bold">Seller profile</div>
                                            <div className="small text-muted">{profileReady ? "Core seller and tax-registration fields are filled." : "Complete the registered seller name, address, TIN, branch, and tax-registration status."}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body d-flex gap-3 align-items-start">
                                        <i className={"bi " + (seriesReady ? "bi-check-circle-fill text-success" : "bi-exclamation-circle text-warning")} style={{ fontSize: "1.5rem" }} />
                                        <div>
                                            <div className="fw-bold">Invoice serial series</div>
                                            <div className="small text-muted">{seriesReady ? "A prefix, authorized number range, ATP reference, and serial-range reference are stored." : "Enter the exact prefix and range from the authorized invoice series. Do not invent a number series."}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form id="invoice-settings-form" onSubmit={submit}>
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 fw-bold mb-1">Registered seller information</h2>
                                    <p className="small text-muted mb-4">Use the registered business information, not assumed placeholders.</p>
                                    <div className="row">
                                        <div className="col-md-6"><TextField label="Display / business name" name="business_name" value={form.business_name} onChange={update} error={errors.business_name} /></div>
                                        <div className="col-md-6"><TextField label="Registered taxpayer name" name="registered_name" value={form.registered_name} onChange={update} error={errors.registered_name} /></div>
                                        <div className="col-md-12"><TextField label="Registered business address" name="address" value={form.address} onChange={update} error={errors.address} /></div>
                                        <div className="col-md-4"><TextField label="TIN" name="tin" value={form.tin} onChange={update} error={errors.tin} help="Enter it exactly as registered." /></div>
                                        <div className="col-md-4"><TextField label="Branch code" name="branch_code" value={form.branch_code} onChange={update} error={errors.branch_code} /></div>
                                        <div className="col-md-4">
                                            <label htmlFor="vat_status" className="form-label fw-semibold">Tax registration status</label>
                                            <select id="vat_status" value={form.vat_status} onChange={(event) => update("vat_status", event.target.value)} className={"form-select" + (errors.vat_status ? " is-invalid" : "")}>
                                                <option value="not_configured">Not configured</option>
                                                <option value="vat">VAT-registered</option>
                                                <option value="non_vat">Non-VAT registered</option>
                                            </select>
                                            {errors.vat_status && <div className="invalid-feedback">{errors.vat_status}</div>}
                                        </div>
                                        <div className="col-md-6"><TextField label="Business phone" name="phone" value={form.phone} onChange={update} error={errors.phone} /></div>
                                        <div className="col-md-6"><TextField label="Business email" name="email" value={form.email} onChange={update} error={errors.email} type="email" /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 fw-bold mb-1">Authorized invoice series</h2>
                                    <p className="small text-muted mb-4">The prefix and numeric bounds must match the actual series approved/authorized for the business. These values are recorded for the next issuance stage and are not yet used to issue numbered invoices.</p>
                                    <div className="row">
                                        <div className="col-md-4"><TextField label="Invoice number prefix" name="invoice_number_prefix" value={form.invoice_number_prefix} onChange={update} error={errors.invoice_number_prefix} help="Example format only; enter your authorized prefix." /></div>
                                        <div className="col-md-4"><TextField label="First authorized number" name="first_invoice_number" value={form.first_invoice_number} onChange={update} error={errors.first_invoice_number} type="number" /></div>
                                        <div className="col-md-4"><TextField label="Last authorized number" name="last_invoice_number" value={form.last_invoice_number} onChange={update} error={errors.last_invoice_number} type="number" /></div>
                                        <div className="col-md-4"><TextField label="Number padding width" name="invoice_number_padding" value={form.invoice_number_padding} onChange={update} error={errors.invoice_number_padding} type="number" help="Number of digits, e.g. 6 produces 000123." /></div>
                                        <div className="col-md-8"><TextField label="Authorized serial-number range reference" name="serial_number_range" value={form.serial_number_range} onChange={update} error={errors.serial_number_range} help="Record the exact series / range reference from the approved document." /></div>
                                        <div className="col-md-6"><TextField label="Authority to Print (ATP) reference" name="bir_atp_number" value={form.bir_atp_number} onChange={update} error={errors.bir_atp_number} /></div>
                                        <div className="col-md-6"><TextField label="BIR permit / registration reference (if applicable)" name="bir_permit_number" value={form.bir_permit_number} onChange={update} error={errors.bir_permit_number} /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 fw-bold mb-1">Electronic-invoicing references</h2>
                                    <p className="small text-muted mb-4">Record references only after they have actually been issued. This screen does not apply for permits or certify the software.</p>
                                    <div className="row">
                                        <div className="col-md-6"><TextField label="Permit to Issue (PTI) Electronic Invoice reference" name="pti_einvoice_number" value={form.pti_einvoice_number} onChange={update} error={errors.pti_einvoice_number} /></div>
                                        <div className="col-md-6"><TextField label="EIS Certification reference" name="eis_certification_reference" value={form.eis_certification_reference} onChange={update} error={errors.eis_certification_reference} /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end pb-4">
                                <button className="btn btn-primary fw-bold px-4" type="submit" disabled={saving}>
                                    {saving ? "SAVING..." : "SAVE SETTINGS"}
                                </button>
                            </div>
                        </form>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
