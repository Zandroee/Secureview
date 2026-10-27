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

export default function Vouchers({ vouchers = [] }) {
    const { props } = usePage();
    const errors = props.errors ?? {};
    const [form, setForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);

    const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
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
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
