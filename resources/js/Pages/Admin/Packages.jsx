import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import catalogImageUrl from "../../Components/catalogImageUrl";
import { Link, router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";

function emptyPackage() {
    return {
        name: "",
        category: "",
        warranty: "1 year",
        price: "",
        installation_fee: "",
        badge: "",
        image: "",
        gallery_managed: true,
        existing_images: [],
        image_files: [],
        specificationsText: "",
        is_featured: false,
        items: [{ product_id: "", quantity: 1 }],
    };
}

function money(value) {
    return "₱" + Number(value ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function componentSubtotal(items = [], products = []) {
    return (items ?? []).reduce((total, item) => {
        const product = (products ?? []).find(
            (candidate) => String(candidate.id) === String(item.product_id)
        );
        const quantity = Number(item.quantity);
        const unitPrice = Number(product?.price ?? 0);

        if (
            !product ||
            !Number.isFinite(quantity) ||
            quantity < 1 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            return total;
        }

        return total + unitPrice * quantity;
    }, 0);
}

function stockClass(stock) {
    return Number(stock) > 0
        ? "bg-success-subtle text-success"
        : "bg-danger-subtle text-danger";
}

function ErrorText({ message }) {
    if (!message) return null;

    return <div className="small text-danger mt-1">{message}</div>;
}


function CatalogOptionSelect({
    label,
    value,
    options = [],
    onChange,
    required = false,
    error,
    allowBlank = false,
}) {
    const field = label.toLowerCase();
    const activeOptions = [...new Map(
        (options ?? [])
            .filter(Boolean)
            .map((item) => [String(item).toLowerCase(), item])
    ).values()];
    const selectValues = [...activeOptions];
    if (value && !selectValues.some((item) => String(item).toLowerCase() === String(value).toLowerCase())) {
        selectValues.push(value);
    }

    const handleChange = (event) => {
        const nextValue = event.target.value;
        if (nextValue === "__add_new_option__") {
            const enteredValue = window.prompt("Add a new " + field + ":");
            const newValue = enteredValue?.trim();
            if (!newValue) return;

            router.post("/admin/catalog-options", { field, value: newValue }, {
                preserveScroll: true,
                onSuccess: () => onChange(newValue),
            });
            return;
        }

        onChange(nextValue);
    };

    const removeOption = (option) => {
        if (!window.confirm(
            "Remove “" + option + "” from the " + field + " options? Existing products and packages using it will keep their saved value."
        )) return;

        router.delete("/admin/catalog-options", {
            data: { field, value: option },
            preserveScroll: true,
        });
    };

    return (
        <div>
            <select
                className={"form-select " + (error ? "is-invalid" : "")}
                value={value ?? ""}
                onChange={handleChange}
                required={required}
            >
                <option value="">
                    {allowBlank ? "No " + field : "Select " + field}
                </option>
                {selectValues.map((item) => (
                    <option key={item} value={item}>{item}</option>
                ))}
                <option value="__add_new_option__">+ Add new {field}…</option>
            </select>

            <details className="mt-2">
                <summary className="small text-primary" style={{ cursor: "pointer" }}>
                    Manage {field} options ({activeOptions.length})
                </summary>
                <div className="border rounded-2 p-2 mt-2">
                    {activeOptions.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                            {activeOptions.map((option) => (
                                <div key={option} className="d-flex justify-content-between align-items-center gap-2">
                                    <span className="small text-break">{option}</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger flex-shrink-0"
                                        onClick={() => removeOption(option)}
                                    >
                                        <i className="bi bi-trash3 me-1" />
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="small text-muted">No saved options. Choose “Add new {field}…” above to create one.</div>
                    )}
                </div>
            </details>
        </div>
    );
}


function imageSource(image) {
    return catalogImageUrl(image);
}

function ImagePicker({
    label,
    currentImages = [],
    selectedFiles = [],
    onFilesChange,
    onRemoveImage,
    error,
}) {
    const [previewUrls, setPreviewUrls] = useState([]);

    useEffect(() => {
        const urls = selectedFiles.map((file) => URL.createObjectURL(file));
        setPreviewUrls(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [selectedFiles]);

    const slotsLeft = Math.max(0, 10 - currentImages.length);
    const addFiles = (event) => {
        const chosen = Array.from(event.target.files ?? []);
        const next = [...selectedFiles, ...chosen].slice(0, slotsLeft + selectedFiles.length);
        onFilesChange(next.slice(0, 10 - currentImages.length));
        event.target.value = "";
    };

    return (
        <div>
            <label className="form-label fw-semibold">{label}</label>
            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className={"form-control " + (error ? "is-invalid" : "")}
                onChange={addFiles}
                disabled={currentImages.length + selectedFiles.length >= 10}
            />
            <div className="form-text">Choose up to 10 images in total. JPG, PNG, or WebP, up to 5 MB each. The first image is the main image.</div>
            {(currentImages.length + selectedFiles.length) > 0 && (
                <div className="row g-2 mt-1">
                    {currentImages.map((image, index) => (
                        <div className="col-auto" key={"existing-" + image + "-" + index}>
                            <div className="position-relative">
                                <img
                                    src={imageSource(image)}
                                    alt={label + " " + (index + 1)}
                                    className="rounded border"
                                    style={{ width: "92px", height: "92px", objectFit: "cover" }}
                                    onError={(event) => {
                                        event.currentTarget.classList.add("d-none");
                                        event.currentTarget.parentElement?.querySelector("[data-image-fallback]")?.classList.remove("d-none");
                                    }}
                                />
                                <div
                                    data-image-fallback
                                    className="bg-secondary-subtle rounded border d-none d-flex align-items-center justify-content-center"
                                    style={{ width: "92px", height: "92px" }}
                                    aria-label="Image unavailable"
                                >
                                    <i className="bi bi-image text-secondary fs-4" />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: "25px", height: "25px", padding: 0 }}
                                    title="Remove image"
                                    aria-label="Remove image"
                                    onClick={() => onRemoveImage(image)}
                                >
                                    <i className="bi bi-x" />
                                </button>
                            </div>
                            {index === 0 && <div className="small text-muted text-center">Primary</div>}
                        </div>
                    ))}
                    {previewUrls.map((url, index) => (
                        <div className="col-auto" key={"new-" + selectedFiles[index]?.name + "-" + index}>
                            <div className="position-relative">
                                <img
                                    src={url}
                                    alt={"Selected upload " + (index + 1)}
                                    className="rounded border"
                                    style={{ width: "92px", height: "92px", objectFit: "cover" }}
                                    onError={(event) => {
                                        event.currentTarget.classList.add("d-none");
                                        event.currentTarget.parentElement?.querySelector("[data-image-fallback]")?.classList.remove("d-none");
                                    }}
                                />
                                <div
                                    data-image-fallback
                                    className="bg-secondary-subtle rounded border d-none d-flex align-items-center justify-content-center"
                                    style={{ width: "92px", height: "92px" }}
                                    aria-label="Image unavailable"
                                >
                                    <i className="bi bi-image text-secondary fs-4" />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: "25px", height: "25px", padding: 0 }}
                                    title="Remove selected image"
                                    aria-label="Remove selected image"
                                    onClick={() => onFilesChange(selectedFiles.filter((_, selectedIndex) => selectedIndex !== index))}
                                >
                                    <i className="bi bi-x" />
                                </button>
                            </div>
                            {currentImages.length === 0 && index === 0 && <div className="small text-muted text-center">Primary</div>}
                            <div className="small text-muted text-truncate" style={{ maxWidth: "92px" }}>{selectedFiles[index]?.name}</div>
                        </div>
                    ))}
                </div>
            )}
            <ErrorText message={error} />
        </div>
    );
}


export default function AdminPackages({
    packages = { data: [], links: [] },
    products = [],
    categories = [],
    categoryOptions = [],
    warrantyOptions = [],
    badgeOptions = [],
    filters = {},
    summary = {},
    success = "",
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [category, setCategory] = useState(filters.category ?? "");
    const [featured, setFeatured] = useState(filters.featured ?? "");
    const [showForm, setShowForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [generalError, setGeneralError] = useState("");

    const form = useForm(emptyPackage());
    const { data, setData, post, processing, errors, clearErrors, transform } = form;
    const componentsLocked = Boolean(
        editingPackage && editingPackage.can_edit_components === false
    );

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/packages",
            { search, category, featured },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setCategory("");
        setFeatured("");

        router.get(
            "/admin/packages",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingPackage(null);
        clearErrors();
        setData(emptyPackage());
        transform((values) => values);
    };

    const openCreate = () => {
        setEditingPackage(null);
        setGeneralError("");
        transform((values) => values);
        clearErrors();
        setData(emptyPackage());
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditingPackage(item);
        setGeneralError("");
        clearErrors();
        setData({
            name: item.name ?? "",
            category: item.category ?? "",
            warranty: item.warranty ?? "",
            price: String(item.price ?? ""),
            installation_fee: item.installation_fee == null ? "" : String(item.installation_fee),
            badge: item.badge ?? "",
            image: item.image ?? "",
            gallery_managed: true,
            existing_images: Array.isArray(item.images) && item.images.length ? item.images : (item.image ? [item.image] : []),
            image_files: [],
            specificationsText: Array.isArray(item.specifications)
                ? item.specifications.join("\n")
                : "",
            is_featured: Boolean(item.is_featured),
            items: item.items?.length
                ? item.items.map((part) => ({
                    product_id: String(part.product_id),
                    quantity: Number(part.quantity ?? 1),
                }))
                : [{ product_id: "", quantity: 1 }],
        });
        setShowForm(true);
    };

    const submit = (event) => {
        event.preventDefault();
        clearErrors();
        setGeneralError("");

        transform((values) => {
            const { specificationsText, ...payload } = values;

            return {
                ...payload,
                ...(editingPackage ? { _method: "patch" } : {}),
                specifications: specificationsText
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
                is_featured: values.is_featured ? 1 : 0,
                items: values.items.map((item) => ({
                    product_id: item.product_id === "" ? "" : Number(item.product_id),
                    quantity: Number(item.quantity),
                })),
            };
        });

        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => closeForm(),
            onError: () => setGeneralError("Please review the highlighted fields and try again."),
        };

        // POST keeps PHP 8.2 multipart fields available; Laravel honors _method=patch.
        post(
            editingPackage
                ? "/admin/packages/" + editingPackage.id
                : "/admin/packages",
            options
        );
    };

    const addComponent = () => {
        setData("items", [...data.items, { product_id: "", quantity: 1 }]);
    };

    const updateComponent = (index, key, value) => {
        const nextItems = data.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            return {
                ...item,
                [key]: key === "quantity" ? (value === "" ? "" : Number(value)) : value,
            };
        });

        setData("items", nextItems);

        if (key === "product_id" || key === "quantity") {
            const total = componentSubtotal(nextItems, products);
            setData("price", total > 0 ? total.toFixed(2) : "");
        }
    };

    const removeComponent = (index) => {
        const nextItems = data.items.length === 1
            ? [{ product_id: "", quantity: 1 }]
            : data.items.filter((_, itemIndex) => itemIndex !== index);

        setData("items", nextItems);
        const total = componentSubtotal(nextItems, products);
        setData("price", total > 0 ? total.toFixed(2) : "");
    };

    const deletePackage = (item) => {
        const confirmed = window.confirm(
            "Remove the package “" + item.name + "” from the live catalog? Existing order and invoice line-item snapshots will be retained. Clear carts, linked inquiries and reviews first."
        );

        if (!confirmed) return;

        setGeneralError("");
        router.delete("/admin/packages/" + item.id, {
            preserveScroll: true,
            onError: (serverErrors) => {
                setGeneralError(
                    serverErrors.package ||
                    "The package could not be deleted. It may be referenced by existing records."
                );
            },
        });
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="packages" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>
                                <h1 className="fw-bold mb-1">PACKAGE MANAGEMENT</h1>
                                <div className="small text-muted">
                                    Build product bundles and manage how they appear in the customer storefront.
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary fw-semibold"
                                onClick={openCreate}
                            >
                                <i className="bi bi-plus-lg me-2" />
                                CREATE PACKAGE
                            </button>
                        </div>

                        {success && (
                            <div className="alert alert-success d-flex align-items-center gap-2">
                                <i className="bi bi-check-circle-fill" />
                                <span>{success}</span>
                            </div>
                        )}

                        {generalError && !showForm && (
                            <div className="alert alert-danger d-flex justify-content-between align-items-start gap-2">
                                <span>{generalError}</span>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Dismiss"
                                    onClick={() => setGeneralError("")}
                                />
                            </div>
                        )}

                        <div className="row g-3 mb-4">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">TOTAL PACKAGES</div>
                                    <div className="h4 fw-bold mb-0">{summary.total ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">FEATURED</div>
                                    <div className="h4 fw-bold text-primary mb-0">{summary.featured ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">IN STOCK</div>
                                    <div className="h4 fw-bold text-success mb-0">{summary.in_stock ?? 0}</div>
                                </div>
                            </div>
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">OUT OF STOCK</div>
                                    <div className="h4 fw-bold text-danger mb-0">{summary.out_of_stock ?? 0}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-3 p-3 p-md-4 mb-4">
                            <form onSubmit={applyFilters}>
                                <div className="row g-3 align-items-end">
                                    <div className="col-12 col-lg-5">
                                        <label className="form-label small fw-semibold">SEARCH</label>
                                        <input
                                            className="form-control"
                                            value={search}
                                            maxLength={120}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Package, category, badge, or product"
                                        />
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <label className="form-label small fw-semibold">CATEGORY</label>
                                        <select
                                            className="form-select"
                                            value={category}
                                            onChange={(event) => setCategory(event.target.value)}
                                        >
                                            <option value="">All categories</option>
                                            {categories.map((item) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-6 col-lg-2">
                                        <label className="form-label small fw-semibold">FEATURED</label>
                                        <select
                                            className="form-select"
                                            value={featured}
                                            onChange={(event) => setFeatured(event.target.value)}
                                        >
                                            <option value="">All packages</option>
                                            <option value="yes">Featured only</option>
                                            <option value="no">Not featured</option>
                                        </select>
                                    </div>

                                    <div className="col-6 col-lg-1 d-grid">
                                        <button type="submit" className="btn btn-primary fw-semibold">
                                            FILTER
                                        </button>
                                    </div>

                                    <div className="col-6 col-lg-1 d-grid">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary fw-semibold"
                                            onClick={clearFilters}
                                        >
                                            CLEAR
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">PACKAGE</th>
                                            <th>PRICE</th>
                                            <th>COMPONENTS</th>
                                            <th>AVAILABLE STOCK</th>
                                            <th>VISIBILITY</th>
                                            <th className="text-end pe-3">ACTIONS</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(packages.data ?? []).length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-5">
                                                    <i className="bi bi-box-seam fs-2 d-block mb-2" />
                                                    No packages found. Create one to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            packages.data.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="ps-3" style={{ minWidth: "230px" }}>
                                                        <div className="d-flex align-items-center gap-3">
                                                            {item.image ? (
                                                                <img
                                                                    src={item.image}
                                                                    alt=""
                                                                    className="rounded border"
                                                                    style={{ width: "58px", height: "58px", objectFit: "cover" }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="rounded border bg-light d-flex align-items-center justify-content-center"
                                                                    style={{ width: "58px", height: "58px" }}
                                                                >
                                                                    <i className="bi bi-box-seam fs-4 text-secondary" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="fw-semibold">{item.name}</div>
                                                                <div className="small text-muted">{item.category}</div>
                                                                {item.badge && (
                                                                    <span className="badge bg-primary-subtle text-primary mt-1">{item.badge}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="fw-semibold text-nowrap">
                                                        {money(item.price)}
                                                        <div className="small text-muted fw-normal mt-1">
                                                            Installation: {Number(item.installation_fee ?? 0) > 0 ? money(item.installation_fee) : "Free"}
                                                        </div>
                                                    </td>

                                                    <td style={{ minWidth: "200px" }}>
                                                        {item.items?.length ? (
                                                            <div className="d-flex flex-column gap-1">
                                                                {item.items.slice(0, 3).map((part) => (
                                                                    <div key={part.product_id} className="small">
                                                                        <span className="fw-semibold">{part.quantity}×</span>{" "}
                                                                        {part.product_name}
                                                                    </div>
                                                                ))}
                                                                {item.items.length > 3 && (
                                                                    <div className="small text-muted">
                                                                        +{item.items.length - 3} more component(s)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="small text-danger">No components configured</span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span className={"badge rounded-pill px-3 py-2 " + stockClass(item.available_stock)}>
                                                            {Number(item.available_stock ?? 0).toLocaleString()}
                                                        </span>
                                                        <div className="small text-muted mt-1">
                                                            {Number(item.available_stock ?? 0) > 0 ? "Complete bundles" : "Unavailable"}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {item.is_featured ? (
                                                            <span className="badge bg-primary-subtle text-primary">
                                                                <i className="bi bi-star-fill me-1" /> Featured
                                                            </span>
                                                        ) : (
                                                            <span className="small text-muted">Standard</span>
                                                        )}
                                                        {!item.can_edit_components && (
                                                            <div className="small text-warning-emphasis mt-1">
                                                                <i className="bi bi-lock-fill me-1" /> Bundle locked
                                                            </div>
                                                        )}
                                                        <div className="small text-muted mt-1">
                                                            {item.reviews_count ?? 0} review(s)
                                                        </div>
                                                    </td>

                                                    <td className="text-end pe-3 text-nowrap">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary me-2"
                                                            onClick={() => openEdit(item)}
                                                        >
                                                            <i className="bi bi-pencil-square me-1" />
                                                            EDIT
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => deletePackage(item)}
                                                        >
                                                            <i className="bi bi-trash me-1" />
                                                            DELETE
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <AdminPagination pagination={packages} label="packages" insideCard />
                        </div>

                        <div className="small text-muted mt-3">
                            Package stock is calculated from its component products. Update actual unit counts in Product Inventory.
                        </div>
                    </main>
                </div>
            </div>

            {showForm && (
                <div
                    className="modal d-block admin-catalog-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="packageFormTitle"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", zIndex: 1055 }}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) closeForm();
                    }}
                >
                    <div className="modal-dialog modal-xl admin-catalog-modal-dialog admin-catalog-modal-dialog-package">
                        <div className="modal-content border-0 rounded-4 shadow admin-catalog-modal-content">
                            <form onSubmit={submit}>
                                <div className="modal-header">
                                    <div>
                                        <div className="small text-primary fw-bold">PACKAGE CATALOG</div>
                                        <h2 className="modal-title fs-5 fw-bold" id="packageFormTitle">
                                            {editingPackage ? "EDIT PACKAGE" : "CREATE PACKAGE"}
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={closeForm}
                                    />
                                </div>

                                <div className="modal-body p-3 p-md-4">
                                    {generalError && (
                                        <div className="alert alert-danger">{generalError}</div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">PACKAGE NAME *</label>
                                            <input
                                                className={"form-control " + (errors.name ? "is-invalid" : "")}
                                                value={data.name}
                                                maxLength={255}
                                                onChange={(event) => setData("name", event.target.value)}
                                                required
                                            />
                                            <ErrorText message={errors.name} />
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label fw-semibold">CATEGORY *</label>
                                            <CatalogOptionSelect
                                                label="Category"
                                                value={data.category}
                                                options={categoryOptions}
                                                required
                                                error={errors.category}
                                                onChange={(value) => setData("category", value)}
                                            />
                                            <ErrorText message={errors.category} />
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label fw-semibold">WARRANTY *</label>
                                            <CatalogOptionSelect
                                                label="Warranty"
                                                value={data.warranty}
                                                options={warrantyOptions}
                                                required
                                                error={errors.warranty}
                                                onChange={(value) => setData("warranty", value)}
                                            />
                                            <ErrorText message={errors.warranty} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">PACKAGE PRICE (₱) *</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                className={"form-control " + (errors.price ? "is-invalid" : "")}
                                                value={data.price}
                                                onChange={(event) => setData("price", event.target.value)}
                                                required
                                            />
                                            <div className="form-text">
                                                Selected product total: {money(componentSubtotal(data.items, products))}. Changes to components automatically recalculate this value.
                                            </div>
                                            <ErrorText message={errors.price} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">
                                                INSTALLATION FEE (₱) <span className="text-muted fw-normal">(OPTIONAL)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99999999.99"
                                                step="0.01"
                                                className={"form-control " + (errors.installation_fee ? "is-invalid" : "")}
                                                value={data.installation_fee}
                                                onChange={(event) => setData("installation_fee", event.target.value)}
                                                placeholder="Leave blank for free installation"
                                            />
                                            <div className="form-text">Blank or ₱0 means installation is free.</div>
                                            <ErrorText message={errors.installation_fee} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">BADGE</label>
                                            <CatalogOptionSelect
                                                label="Badge"
                                                value={data.badge}
                                                options={badgeOptions}
                                                allowBlank
                                                error={errors.badge}
                                                onChange={(value) => setData("badge", value)}
                                            />
                                            <ErrorText message={errors.badge} />
                                        </div>

                                        <div className="col-md-4">
                                            <ImagePicker
                                                label="PACKAGE IMAGE"
                                                currentImages={data.existing_images}
                                                selectedFiles={data.image_files}
                                                onFilesChange={(files) => setData("image_files", files)}
                                                onRemoveImage={(image) => setData("existing_images", data.existing_images.filter((item) => item !== image))}
                                                error={errors.image_files || errors.image_file}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold">SPECIFICATIONS</label>
                                            <textarea
                                                className={"form-control " + (errors.specifications ? "is-invalid" : "")}
                                                rows={4}
                                                value={data.specificationsText}
                                                onChange={(event) => setData("specificationsText", event.target.value)}
                                                placeholder={"One specification per line\nExample: 4-channel NVR\n4 security cameras"}
                                            />
                                            <div className="form-text">Enter one specification per line. Blank lines are ignored.</div>
                                            <ErrorText message={errors.specifications} />
                                            {Object.entries(errors)
                                                .filter(([key]) => key.startsWith("specifications."))
                                                .map(([key, message]) => <ErrorText key={key} message={message} />)}
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    id="package-featured"
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={Boolean(data.is_featured)}
                                                    onChange={(event) => setData("is_featured", event.target.checked)}
                                                />
                                                <label className="form-check-label fw-semibold" htmlFor="package-featured">
                                                    Feature this package in storefront areas that show featured items
                                                </label>
                                            </div>
                                            <ErrorText message={errors.is_featured} />
                                        </div>
                                    </div>

                                    <hr className="my-4" />

                                    {componentsLocked && (
                                        <div className="alert alert-warning">
                                            <div className="fw-semibold mb-1">
                                                <i className="bi bi-lock-fill me-1" /> Bundle contents are locked
                                            </div>
                                            This package is referenced by existing purchase, cart, inquiry, or review records.
                                            You can update package details, but its component products and quantities cannot be changed.
                                            Create a new package if you need a different bundle.
                                        </div>
                                    )}

                                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                        <div>
                                            <h3 className="fs-6 fw-bold mb-1">BUNDLE COMPONENTS *</h3>
                                            <div className="small text-muted">
                                                Select the products included and how many units of each complete bundle requires.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={addComponent}
                                            disabled={data.items.length >= 50 || componentsLocked}
                                        >
                                            <i className="bi bi-plus-lg me-1" /> ADD PRODUCT
                                        </button>
                                    </div>

                                    <ErrorText message={errors.items} />

                                    <div className="d-flex flex-column gap-3">
                                        {data.items.map((item, index) => {
                                            const selectedId = String(item.product_id ?? "");
                                            const availableProducts = products.filter((product) =>
                                                String(product.id) === selectedId ||
                                                !data.items.some((other, otherIndex) =>
                                                    otherIndex !== index && String(other.product_id) === String(product.id)
                                                )
                                            );

                                            const selectedProduct = products.find(
                                                (product) => String(product.id) === selectedId
                                            );

                                            return (
                                                <div className="row g-2 align-items-end border rounded-3 p-2 mx-0" key={index}>
                                                    <div className="col-12 col-md-7">
                                                        <label className="form-label small fw-semibold">PRODUCT {index + 1} *</label>
                                                        <select
                                                            className={"form-select " + (errors["items." + index + ".product_id"] ? "is-invalid" : "")}
                                                            value={selectedId}
                                                            onChange={(event) => updateComponent(index, "product_id", event.target.value)}
                                                            required
                                                            disabled={componentsLocked}
                                                        >
                                                            <option value="">Select a product</option>
                                                            {availableProducts.map((product) => (
                                                                <option key={product.id} value={product.id}>
                                                                    {product.name} — {money(product.price)} · stock {product.stock_quantity}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ErrorText message={errors["items." + index + ".product_id"]} />
                                                        {selectedProduct && (
                                                            <div className="form-text">
                                                                {selectedProduct.category} · Current units in inventory: {selectedProduct.stock_quantity}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="col-8 col-md-3">
                                                        <label className="form-label small fw-semibold">UNITS PER BUNDLE *</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            step="1"
                                                            className={"form-control " + (errors["items." + index + ".quantity"] ? "is-invalid" : "")}
                                                            value={item.quantity}
                                                            onChange={(event) => updateComponent(index, "quantity", event.target.value)}
                                                            required
                                                            disabled={componentsLocked}
                                                        />
                                                        <ErrorText message={errors["items." + index + ".quantity"]} />
                                                    </div>

                                                    <div className="col-4 col-md-2 d-grid">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            onClick={() => removeComponent(index)}
                                                            aria-label={"Remove product " + (index + 1)}
                                                            disabled={componentsLocked}
                                                        >
                                                            <i className="bi bi-trash me-1" /> REMOVE
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {products.length === 0 && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            Add products in Product Inventory before creating a package.
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={closeForm}
                                        disabled={processing}
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-semibold"
                                        disabled={processing || products.length === 0}
                                    >
                                        {processing ? "SAVING..." : editingPackage ? "SAVE CHANGES" : "CREATE PACKAGE"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
