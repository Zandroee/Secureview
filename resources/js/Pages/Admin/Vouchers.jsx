import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

const emptyForm = {
    code: "",
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: "10",
    minimum_subtotal: "0",
    maximum_discount: "",
    starts_at: "",
    expires_at: "",
    usage_limit: "",
    per_user_limit: "",
    is_active: true,
};

function money(value) {
    return Number(value ?? 0).toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fieldError(errors, name) {
    const value = errors?.[name];
    return Array.isArray(value) ? value[0] : value;
}

function Field({ label, name, value, onChange, error, type = "text", help, ...props }) {
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
                {...props}
            />
            {help && <div className="form-text">{help}</div>}
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
}

function voucherState(voucher) {
    const now = Date.now();
    if (!voucher.is_active) return { label: "Inactive", className: "text-bg-secondary" };
    if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now) {
        return { label: "Scheduled", className: "text-bg-info" };
    }
    if (voucher.expires_at && new Date(voucher.expires_at).getTime() < now) {
        return { label: "Expired", className: "text-bg-warning" };
    }
    if (voucher.usage_limit != null && voucher.uses_count >= voucher.usage_limit) {
        return { label: "Limit reached", className: "text-bg-warning" };
    }
    return { label: "Active", className: "text-bg-success" };
}

function promoSaleState(item) {
    const regular = Number(item.price ?? 0);
    const sale = Number(item.sale_price ?? 0);
    if (!sale || sale <= 0 || sale >= regular) {
        return { label: "No sale", className: "text-bg-secondary" };
    }

    const now = Date.now();
    const startsAt = item.sale_starts_at ? new Date(item.sale_starts_at).getTime() : null;
    const endsAt = item.sale_ends_at ? new Date(item.sale_ends_at).getTime() : null;
    if (startsAt && Number.isFinite(startsAt) && startsAt > now) {
        return { label: "Scheduled", className: "text-bg-info" };
    }
    if (endsAt && Number.isFinite(endsAt) && endsAt <= now) {
        return { label: "Ended", className: "text-bg-warning" };
    }
    return { label: "Active", className: "text-bg-success" };
}

export default function Vouchers({ vouchers = [], saleProducts = [], salePackages = [] }) {
    const { props } = usePage();
    const errors = props.errors ?? {};
    const [form, setForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [saleType, setSaleType] = useState("products");
    const [saleSearch, setSaleSearch] = useState("");
    const [editingSale, setEditingSale] = useState(null);
    const [saleForm, setSaleForm] = useState({ sale_price: "", sale_starts_at: "", sale_ends_at: "" });
    const [savingSale, setSavingSale] = useState(false);

    const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
    const updateSale = (name, value) => setSaleForm((current) => ({ ...current, [name]: value }));
    const reset = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
    };

    const startEdit = (voucher) => {
        setEditingId(voucher.id);
        setForm({
            code: voucher.code ?? "",
            name: voucher.name ?? "",
            description: voucher.description ?? "",
            discount_type: voucher.discount_type ?? "percentage",
            discount_value: String(voucher.discount_value ?? ""),
            minimum_subtotal: String(voucher.minimum_subtotal ?? "0"),
            maximum_discount: voucher.maximum_discount == null ? "" : String(voucher.maximum_discount),
            starts_at: voucher.starts_at ?? "",
            expires_at: voucher.expires_at ?? "",
            usage_limit: voucher.usage_limit == null ? "" : String(voucher.usage_limit),
            per_user_limit: voucher.per_user_limit == null ? "" : String(voucher.per_user_limit),
            is_active: Boolean(voucher.is_active),
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const submit = (event) => {
        event.preventDefault();
        setSaving(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => reset(),
            onFinish: () => setSaving(false),
        };

        if (editingId) {
            router.patch("/admin/vouchers/" + editingId, form, options);
        } else {
            router.post("/admin/vouchers", form, options);
        }
    };

    const toggleActive = (voucher) => {
        setActionId(voucher.id);
        router.patch("/admin/vouchers/" + voucher.id, {
            code: voucher.code,
            name: voucher.name,
            description: voucher.description ?? "",
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value,
            minimum_subtotal: voucher.minimum_subtotal,
            maximum_discount: voucher.maximum_discount ?? "",
            starts_at: voucher.starts_at ?? "",
            expires_at: voucher.expires_at ?? "",
            usage_limit: voucher.usage_limit ?? "",
            per_user_limit: voucher.per_user_limit ?? "",
            is_active: !voucher.is_active,
        }, {
            preserveScroll: true,
            onFinish: () => setActionId(null),
        });
    };

    const deleteVoucher = (voucher) => {
        if (!window.confirm("Delete voucher " + voucher.code + "? If it is linked to an order, SecureView will require you to deactivate it instead.")) {
            return;
        }
        setActionId(voucher.id);
        router.delete("/admin/vouchers/" + voucher.id, {
            preserveScroll: true,
            onFinish: () => setActionId(null),
        });
    };

    const startSaleEdit = (type, item) => {
        setEditingSale({ type, item });
        setSaleForm({
            sale_price: item.sale_price == null ? "" : String(item.sale_price),
            sale_starts_at: item.sale_starts_at ?? "",
            sale_ends_at: item.sale_ends_at ?? "",
        });
    };

    const submitSale = (event) => {
        event.preventDefault();
        if (!editingSale) return;
        setSavingSale(true);
        router.patch("/admin/promotions/" + editingSale.type + "/" + editingSale.item.id + "/sale", saleForm, {
            preserveScroll: true,
            onSuccess: () => setEditingSale(null),
            onFinish: () => setSavingSale(false),
        });
    };

    const currentSaleItems = saleType === "products" ? saleProducts : salePackages;
    const filteredSaleItems = currentSaleItems.filter((item) => {
        const search = saleSearch.trim().toLowerCase();
        if (!search) return true;
        return [item.name, item.brand, item.category]
            .some((value) => String(value ?? "").toLowerCase().includes(search));
    });

    return (
        <div>
            <Navbar />
            <div className="container-fluid py-4" style={{ fontFamily: "Outfit, sans-serif", background: "#f7f7f8", minHeight: "70vh" }}>
                <div className="row g-0">
                    <div className="col-lg-3 col-xl-2 mb-4 mb-lg-0">
                        <Sidebar active="vouchers" />
                    </div>
                    <main className="col-lg-9 col-xl-10 px-3 px-lg-4">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold text-uppercase">Sales & promotions</div>
                                <h1 className="fw-bold mb-1">PROMOTIONS & VOUCHERS</h1>
                                <p className="text-muted mb-0">Create discount codes, schedule campaigns, and set usage limits.</p>
                            </div>
                            <span className="badge rounded-pill text-bg-light border px-3 py-2">{vouchers.length} code{vouchers.length === 1 ? "" : "s"}</span>
                        </div>

                        {props.flash?.success && <div className="alert alert-success" role="status">{props.flash.success}</div>}
                        {fieldError(errors, "voucher") && <div className="alert alert-danger" role="alert">{fieldError(errors, "voucher")}</div>}

                        <section className="card border-0 shadow-sm mb-4" aria-labelledby="promo-sales-title">
                            <div className="card-header bg-white py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                                <div>
                                    <h2 className="h5 fw-bold mb-1" id="promo-sales-title">Promo Sales</h2>
                                    <p className="small text-muted mb-0">Manage automatic discounts for individual products and packages. These run separately from voucher codes.</p>
                                </div>
                                <div className="btn-group flex-shrink-0" role="group" aria-label="Choose catalog type">
                                    <button type="button" className={"btn btn-sm " + (saleType === "products" ? "btn-primary" : "btn-outline-primary")} onClick={() => setSaleType("products")}>
                                        Products <span className="badge text-bg-light ms-1">{saleProducts.length}</span>
                                    </button>
                                    <button type="button" className={"btn btn-sm " + (saleType === "packages" ? "btn-primary" : "btn-outline-primary")} onClick={() => setSaleType("packages")}>
                                        Packages <span className="badge text-bg-light ms-1">{salePackages.length}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="row g-3 align-items-center mb-3">
                                    <div className="col-12 col-lg">
                                        <div className="small text-muted">A sale activates automatically at its start time and ends at its scheduled end time. Leave the sale price blank to remove a sale.</div>
                                    </div>
                                    <div className="col-12 col-lg-4">
                                        <input type="search" className="form-control" value={saleSearch} onChange={(event) => setSaleSearch(event.target.value)} placeholder={"Search " + saleType + " by name, brand, or category"} aria-label={"Search " + saleType} />
                                    </div>
                                </div>
                                <div className="table-responsive" style={{ maxHeight: "520px", overflowY: "auto" }}>
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr><th>Catalog item</th><th>Regular price</th><th>Promo price</th><th>Schedule / status</th><th className="text-end">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredSaleItems.length === 0 && (
                                                <tr><td colSpan={5} className="text-center text-muted py-4">
                                                    {currentSaleItems.length === 0 ? "No " + saleType + " have been added yet." : "No matching items found."}
                                                </td></tr>
                                            )}
                                            {filteredSaleItems.map((item) => {
                                                const state = promoSaleState(item);
                                                return (
                                                    <tr key={item.id}>
                                                        <td style={{ minWidth: "190px" }}>
                                                            <div className="fw-semibold">{item.name}</div>
                                                            <div className="small text-muted">{[item.brand, item.category].filter(Boolean).join(" · ") || (saleType === "products" ? "Product" : "Package")}</div>
                                                        </td>
                                                        <td className="text-nowrap">{money(item.price)}</td>
                                                        <td className="text-nowrap">
                                                            {item.sale_price != null ? <span className="fw-bold text-danger">{money(item.sale_price)}</span> : <span className="text-muted">—</span>}
                                                        </td>
                                                        <td style={{ minWidth: "190px" }}>
                                                            <span className={"badge " + state.className}>{state.label}</span>
                                                            {item.sale_price != null && (
                                                                <div className="small text-muted mt-1">
                                                                    {item.sale_starts_at ? "From " + item.sale_starts_at.replace("T", " ") : "Starts immediately"}
                                                                    {" · "}
                                                                    {item.sale_ends_at ? "Until " + item.sale_ends_at.replace("T", " ") : "No end date"}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-end text-nowrap">
                                                            <button type="button" className="btn btn-sm btn-outline-primary fw-semibold" onClick={() => startSaleEdit(saleType, item)}>
                                                                {item.sale_price != null ? "Edit sale" : "Set sale"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-bottom py-3">
                                <h2 className="h5 fw-bold mb-0">{editingId ? "Edit voucher" : "Create a promotion voucher"}</h2>
                            </div>
                            <div className="card-body p-3 p-lg-4">
                                <form onSubmit={submit}>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <Field label="Voucher code" name="code" value={form.code} onChange={(name, value) => update(name, value.toUpperCase().replace(/\s+/g, ""))} error={fieldError(errors, "code")} maxLength={50} required help="Example: SAVE10 or CCTV2026. Letters, numbers, hyphens and underscores." />
                                        </div>
                                        <div className="col-md-8">
                                            <Field label="Promotion name" name="name" value={form.name} onChange={update} error={fieldError(errors, "name")} maxLength={120} required placeholder="Welcome discount" />
                                        </div>
                                        <div className="col-12">
                                            <label htmlFor="description" className="form-label fw-semibold">Customer-facing description (optional)</label>
                                            <textarea id="description" className={"form-control" + (fieldError(errors, "description") ? " is-invalid" : "")} value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={1000} rows={2} placeholder="A short explanation displayed when the code is applied." />
                                            {fieldError(errors, "description") && <div className="invalid-feedback">{fieldError(errors, "description")}</div>}
                                        </div>
                                        <div className="col-md-4">
                                            <label htmlFor="discount_type" className="form-label fw-semibold">Discount type</label>
                                            <select id="discount_type" className={"form-select" + (fieldError(errors, "discount_type") ? " is-invalid" : "")} value={form.discount_type} onChange={(event) => update("discount_type", event.target.value)}>
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed amount (₱)</option>
                                            </select>
                                            {fieldError(errors, "discount_type") && <div className="invalid-feedback">{fieldError(errors, "discount_type")}</div>}
                                        </div>
                                        <div className="col-md-4">
                                            <Field label={form.discount_type === "percentage" ? "Discount percentage" : "Discount amount (₱)"} name="discount_value" value={form.discount_value} onChange={update} error={fieldError(errors, "discount_value")} type="number" min="0.01" max={form.discount_type === "percentage" ? "99" : "1000000"} step="0.01" required />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Minimum merchandise subtotal (₱)" name="minimum_subtotal" value={form.minimum_subtotal} onChange={update} error={fieldError(errors, "minimum_subtotal")} type="number" min="0" step="0.01" required />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Maximum discount (₱, optional)" name="maximum_discount" value={form.maximum_discount} onChange={update} error={fieldError(errors, "maximum_discount")} type="number" min="0.01" step="0.01" disabled={form.discount_type !== "percentage"} help="Only applies to percentage discounts." />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Starts at (optional)" name="starts_at" value={form.starts_at} onChange={update} error={fieldError(errors, "starts_at")} type="datetime-local" />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Expires at (optional)" name="expires_at" value={form.expires_at} onChange={update} error={fieldError(errors, "expires_at")} type="datetime-local" />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Total uses limit (optional)" name="usage_limit" value={form.usage_limit} onChange={update} error={fieldError(errors, "usage_limit")} type="number" min="1" step="1" help="Leave blank for unlimited uses." />
                                        </div>
                                        <div className="col-md-4">
                                            <Field label="Uses per customer (optional)" name="per_user_limit" value={form.per_user_limit} onChange={update} error={fieldError(errors, "per_user_limit")} type="number" min="1" step="1" help="Leave blank for no per-customer cap." />
                                        </div>
                                        <div className="col-md-4 d-flex align-items-center">
                                            <div className="form-check form-switch mt-3">
                                                <input id="is_active" type="checkbox" className="form-check-input" checked={Boolean(form.is_active)} onChange={(event) => update("is_active", event.target.checked)} />
                                                <label htmlFor="is_active" className="form-check-label fw-semibold">Voucher is active</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="alert alert-info small mt-3 mb-3">
                                        Discounts apply to products/packages only, not delivery or service fees. The final amount is recalculated on the server; online payments retain the exact discounted order total.
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        <button type="submit" className="btn btn-primary fw-bold" disabled={saving}>
                                            {saving ? "SAVING..." : editingId ? "SAVE CHANGES" : "CREATE VOUCHER"}
                                        </button>
                                        {editingId && <button type="button" className="btn btn-outline-secondary fw-semibold" onClick={reset} disabled={saving}>CANCEL EDIT</button>}
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h2 className="h5 fw-bold mb-0">Voucher codes</h2>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Promotion</th><th>Discount</th><th>Rules</th><th>Usage</th><th>Status</th><th className="text-end">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {vouchers.length === 0 && (
                                            <tr><td colSpan={6} className="text-center text-muted py-5">No vouchers yet. Create your first promotion above.</td></tr>
                                        )}
                                        {vouchers.map((voucher) => {
                                            const state = voucherState(voucher);
                                            return (
                                                <tr key={voucher.id}>
                                                    <td style={{ minWidth: "220px" }}>
                                                        <div className="fw-bold text-primary">{voucher.code}</div>
                                                        <div className="fw-semibold">{voucher.name}</div>
                                                        {voucher.description && <div className="small text-muted">{voucher.description}</div>}
                                                        <div className="small text-muted mt-1">
                                                            {voucher.starts_at ? "From " + voucher.starts_at.replace("T", " ") : "No start date"}
                                                            {" · "}
                                                            {voucher.expires_at ? "Until " + voucher.expires_at.replace("T", " ") : "No expiry"}
                                                        </div>
                                                    </td>
                                                    <td style={{ minWidth: "145px" }}>
                                                        <div className="fw-bold">{voucher.discount_type === "percentage" ? Number(voucher.discount_value).toLocaleString() + "% off" : money(voucher.discount_value) + " off"}</div>
                                                        {Number(voucher.minimum_subtotal) > 0 && <div className="small text-muted">Min. spend {money(voucher.minimum_subtotal)}</div>}
                                                        {voucher.discount_type === "percentage" && voucher.maximum_discount != null && <div className="small text-muted">Max. {money(voucher.maximum_discount)}</div>}
                                                    </td>
                                                    <td style={{ minWidth: "150px" }}>
                                                        <div className="small">Total uses: {voucher.usage_limit ?? "Unlimited"}</div>
                                                        <div className="small">Per customer: {voucher.per_user_limit ?? "Unlimited"}</div>
                                                    </td>
                                                    <td style={{ minWidth: "110px" }}>
                                                        <div className="fw-semibold">{voucher.uses_count} used</div>
                                                        {voucher.usage_limit != null && <div className="small text-muted">{Math.max(0, voucher.usage_limit - voucher.uses_count)} left</div>}
                                                    </td>
                                                    <td><span className={"badge " + state.className}>{state.label}</span></td>
                                                    <td className="text-end" style={{ minWidth: "190px" }}>
                                                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                                                            <button type="button" className="btn btn-sm btn-outline-primary fw-semibold" onClick={() => startEdit(voucher)}>Edit</button>
                                                            <button type="button" className={"btn btn-sm fw-semibold " + (voucher.is_active ? "btn-outline-warning" : "btn-outline-success")} onClick={() => toggleActive(voucher)} disabled={actionId === voucher.id}>
                                                                {actionId === voucher.id ? "..." : voucher.is_active ? "Deactivate" : "Activate"}
                                                            </button>
                                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteVoucher(voucher)} disabled={actionId === voucher.id}>Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer bg-white small text-muted">
                                Up to 200 recent vouchers are shown. Vouchers attached to orders cannot be deleted, preserving order history; deactivate them instead.
                            </div>
                        </div>
                        {editingSale && (
                            <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="promo-sale-editor-title"
                                style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", zIndex: 1050 }}
                                onClick={(event) => { if (event.target === event.currentTarget && !savingSale) setEditingSale(null); }}>
                                <div className="modal-dialog modal-dialog-centered" role="document" onClick={(event) => event.stopPropagation()}>
                                    <div className="modal-content border-0 shadow">
                                        <form onSubmit={submitSale}>
                                            <div className="modal-header">
                                                <div>
                                                    <h2 className="modal-title fs-5 fw-bold" id="promo-sale-editor-title">{editingSale.item.sale_price != null ? "Edit promo sale" : "Schedule promo sale"}</h2>
                                                    <div className="small text-muted mt-1">{editingSale.item.name} · Regular price {money(editingSale.item.price)}</div>
                                                </div>
                                                <button type="button" className="btn-close" aria-label="Close" onClick={() => !savingSale && setEditingSale(null)} disabled={savingSale} />
                                            </div>
                                            <div className="modal-body">
                                                <Field label="Promo sale price (₱)" name="sale_price" value={saleForm.sale_price} onChange={updateSale}
                                                    error={fieldError(errors, "sale_price")} type="number" min="0.01" max="99999999.99" step="0.01"
                                                    placeholder="Leave blank to remove the sale" help="Must be lower than the regular price." />
                                                <Field label="Sale starts at (optional)" name="sale_starts_at" value={saleForm.sale_starts_at} onChange={updateSale}
                                                    error={fieldError(errors, "sale_starts_at")} type="datetime-local" />
                                                <Field label="Sale ends at (optional)" name="sale_ends_at" value={saleForm.sale_ends_at} onChange={updateSale}
                                                    error={fieldError(errors, "sale_ends_at")} type="datetime-local" />
                                                <p className="small text-muted mb-0">Times use the SecureView application timezone. The discounted price is applied automatically at checkout while the sale is active.</p>
                                            </div>
                                            <div className="modal-footer">
                                                <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingSale(null)} disabled={savingSale}>Cancel</button>
                                                <button type="submit" className="btn btn-primary fw-bold" disabled={savingSale}>{savingSale ? "SAVING..." : "SAVE SALE"}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
