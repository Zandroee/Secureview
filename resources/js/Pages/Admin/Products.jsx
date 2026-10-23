import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import catalogImageUrl from "../../Components/catalogImageUrl";
import { router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";

function stockClass(quantity) {
    if (quantity <= 0) {
        return "bg-danger-subtle text-danger";
    }

    if (quantity <= 5) {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-success-subtle text-success";
}

function stockLabel(quantity) {
    if (quantity <= 0) {
        return "Out of Stock";
    }

    if (quantity <= 5) {
        return "Low Stock";
    }

    return "In Stock";
}

function money(value) {
    return "₱" + Number(value ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}


function emptyProduct() {
    return {
        name: "",
        category: "",
        warranty: "1 year",
        price: "",
        installation_fee: "",
        stock_quantity: 0,
        stock_reason: "",
        badge: "",
        image: "",
        gallery_managed: true,
        existing_images: [],
        image_files: [],
        specifications: [],
        is_featured: false,
    };
}

function FieldError({ message }) {
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
            <FieldError message={error} />
        </div>
    );
}


export default function AdminProducts({
    products = [],
    categories = [],
    categoryOptions = [],
    warrantyOptions = [],
    badgeOptions = [],
    summary = {},
    filters = {},
    success = "",
    errors = {},
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [category, setCategory] = useState(filters.category ?? "");
    const [stockValues, setStockValues] = useState(
        () =>
            Object.fromEntries(
                (products.data ?? []).map((product) => [
                    product.id,
                    Number(product.stock_quantity ?? 0),
                ])
            )
    );
    const [savingId, setSavingId] = useState(null);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const productForm = useForm(emptyProduct());

    const openCreateProduct = () => {
        setEditingProductId(null);
        productForm.transform((data) => data);
        productForm.clearErrors();
        productForm.setData(emptyProduct());
        setProductModalOpen(true);
    };

    const openEditProduct = (product) => {
        setEditingProductId(product.id);
        productForm.clearErrors();
        productForm.setData({
            name: product.name ?? "",
            category: product.category ?? "",
            warranty: product.warranty ?? "1 year",
            price: String(product.price ?? ""),
            installation_fee: product.installation_fee == null ? "" : String(product.installation_fee),
            stock_quantity: Number(product.stock_quantity ?? 0),
            stock_reason: "",
            badge: product.badge ?? "",
            image: product.image ?? "",
            gallery_managed: true,
            existing_images: Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []),
            image_files: [],
            specifications: Array.isArray(product.specifications) ? product.specifications : [],
            is_featured: Boolean(product.is_featured),
        });
        setProductModalOpen(true);
    };

    const saveProduct = (event) => {
        event.preventDefault();

        const hasNewImages = (productForm.data.image_files ?? []).length > 0;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setProductModalOpen(false);
                setEditingProductId(null);
                productForm.reset();
            },
            onFinish: () => {
                // Ensure a multipart-only method override never leaks into the next save.
                productForm.transform((data) => data);
            },
        };

        if (editingProductId && hasNewImages) {
            // Multipart uploads use POST plus Laravel method spoofing on PHP 8.2.
            productForm
                .transform((data) => ({ ...data, _method: "patch" }))
                .post("/admin/products/" + editingProductId, {
                    ...options,
                    forceFormData: true,
                });
        } else if (editingProductId) {
            // Without new files, send JSON via the normal PATCH route. This avoids
            // multipart parsing issues when the admin is only editing existing values.
            productForm
                .transform((data) => data)
                .patch("/admin/products/" + editingProductId, options);
        } else {
            productForm
                .transform((data) => data)
                .post("/admin/products", {
                    ...options,
                    forceFormData: hasNewImages,
                });
        }
    };

    const deleteProduct = (product) => {
        if (!product.can_delete) return;
        if (!window.confirm("Delete “" + product.name + "”? This removes it from the live catalog. Existing order and invoice line-item snapshots will be retained.")) return;

        router.delete("/admin/products/" + product.id, {
            preserveScroll: true,
            onError: (serverErrors) => {
                window.alert(serverErrors.product || "The product could not be deleted. Clear catalog references first, then try again.");
            },
        });
    };

    useEffect(() => {
        setStockValues(
            Object.fromEntries(
                (products.data ?? []).map((product) => [
                    product.id,
                    Number(product.stock_quantity ?? 0),
                ])
            )
        );
    }, [products]);

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/products",
            {
                search,
                category,
            },
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

        router.get(
            "/admin/products",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const updateStock = (product) => {
        setSavingId(product.id);

        router.patch(
            "/admin/products/" + product.id + "/stock",
            {
                stock_quantity: Number(stockValues[product.id] ?? 0),
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingId(null),
            }
        );
    };

    const updateValue = (productId, value) => {
        const nextValue = value === "" ? "" : Math.max(0, Number(value));

        setStockValues((previous) => ({
            ...previous,
            [productId]: nextValue,
        }));
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="products" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">
                                    SECUREVIEW ADMIN
                                </div>

                                <h1 className="fw-bold mb-1">
                                    PRODUCT INVENTORY
                                </h1>

                                <div className="small text-muted">
                                    Add and maintain products and manage stock.
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary fw-bold"
                                onClick={openCreateProduct}
                            >
                                <i className="bi bi-plus-lg me-2" /> ADD PRODUCT
                            </button>
                        </div>

                        {success && (
                            <div className="alert alert-success">
                                {success}
                            </div>
                        )}
                        {errors.product && (
                            <div className="alert alert-danger">{errors.product}</div>
                        )}

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TOTAL PRODUCTS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.total_products ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TOTAL UNITS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.total_units ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        LOW STOCK
                                    </div>

                                    <div className="h4 fw-bold text-warning mb-0">
                                        {summary.low_stock ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        OUT OF STOCK
                                    </div>

                                    <div className="h4 fw-bold text-danger mb-0">
                                        {summary.out_of_stock ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-white border rounded-3 p-3 mb-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <form
                                className="row g-2 align-items-end"
                                onSubmit={applyFilters}
                            >
                                <div className="col-lg-6">
                                    <label className="form-label small fw-semibold mb-1">
                                        SEARCH
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Product name or category"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small fw-semibold mb-1">
                                        CATEGORY
                                    </label>

                                    <select
                                        className="form-select"
                                        value={category}
                                        onChange={(event) =>
                                            setCategory(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            All categories
                                        </option>

                                        {categories.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-sm-6 col-lg-2 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary fw-bold"
                                        onClick={clearFilters}
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div
                            className="bg-white border rounded-3 mb-4"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">PRODUCT</th>
                                            <th>PRICE</th>
                                            <th>SPECIFICATIONS</th>
                                            <th>AVAILABLE STOCK</th>
                                            <th>VISIBILITY</th>
                                            <th className="text-end pe-3">ACTIONS</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(products.data ?? []).length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-5">
                                                    <i className="bi bi-camera-video fs-2 d-block mb-2" />
                                                    No products found. Add a product to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            (products.data ?? []).map((product) => {
                                                const value = Number(stockValues[product.id] ?? 0);
                                                const primaryImage = product.image || product.images?.[0] || null;
                                                const specifications = Array.isArray(product.specifications)
                                                    ? product.specifications.filter(Boolean)
                                                    : [];

                                                return (
                                                    <tr key={product.id}>
                                                        <td className="ps-3" style={{ minWidth: "230px" }}>
                                                            <div className="d-flex align-items-center gap-3">
                                                                {primaryImage ? (
                                                                    <img
                                                                        src={imageSource(primaryImage)}
                                                                        alt=""
                                                                        className="rounded border"
                                                                        style={{ width: "58px", height: "58px", objectFit: "cover", flexShrink: 0 }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="rounded border bg-light d-flex align-items-center justify-content-center"
                                                                        style={{ width: "58px", height: "58px", flexShrink: 0 }}
                                                                    >
                                                                        <i className="bi bi-camera-video fs-4 text-secondary" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="fw-semibold">{product.name}</div>
                                                                    <div className="small text-muted">Product #{product.id} · {product.category}</div>
                                                                    {product.badge && (
                                                                        <span className="badge bg-primary-subtle text-primary mt-1">{product.badge}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="fw-semibold text-nowrap">
                                                            {money(product.price)}
                                                            <div className="small text-muted fw-normal mt-1">
                                                                Installation: {Number(product.installation_fee ?? 0) > 0 ? money(product.installation_fee) : "Free"}
                                                            </div>
                                                        </td>

                                                        <td style={{ minWidth: "210px" }}>
                                                            {specifications.length > 0 ? (
                                                                <div className="d-flex flex-column gap-1">
                                                                    {specifications.slice(0, 3).map((specification, index) => (
                                                                        <div key={index} className="small">{specification}</div>
                                                                    ))}
                                                                    {specifications.length > 3 && (
                                                                        <div className="small text-muted">+{specifications.length - 3} more specification(s)</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="small text-muted">No specifications listed</span>
                                                            )}
                                                        </td>

                                                        <td style={{ minWidth: "160px" }} data-sort-value={value}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                className="form-control form-control-sm mb-2"
                                                                aria-label={"Stock quantity for " + product.name}
                                                                value={stockValues[product.id] ?? 0}
                                                                onChange={(event) => updateValue(product.id, event.target.value)}
                                                            />
                                                            <span className={"badge rounded-pill px-3 py-2 " + stockClass(value)}>
                                                                {value.toLocaleString()}
                                                            </span>
                                                            <div className="small text-muted mt-1">{stockLabel(value)}</div>
                                                        </td>

                                                        <td>
                                                            {product.is_featured ? (
                                                                <span className="badge bg-primary-subtle text-primary">
                                                                    <i className="bi bi-star-fill me-1" /> Featured
                                                                </span>
                                                            ) : (
                                                                <span className="small text-muted">Standard</span>
                                                            )}
                                                            <div className="small text-muted mt-1">{product.reviews_count ?? 0} review(s)</div>
                                                            {!product.can_delete && (
                                                                <div className="small text-warning-emphasis mt-1">
                                                                    <i className="bi bi-lock-fill me-1" /> Catalog references
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="text-end pe-3 text-nowrap">
                                                            <div className="d-flex justify-content-end flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm fw-bold"
                                                                    onClick={() => openEditProduct(product)}
                                                                >
                                                                    <i className="bi bi-pencil-square me-1" /> EDIT
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm fw-bold"
                                                                    onClick={() => updateStock(product)}
                                                                    disabled={savingId === product.id}
                                                                >
                                                                    <i className="bi bi-save me-1" />
                                                                    {savingId === product.id ? "SAVING..." : "SAVE STOCK"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger btn-sm fw-bold"
                                                                    onClick={() => deleteProduct(product)}
                                                                    disabled={!product.can_delete}
                                                                    title={product.can_delete
                                                                        ? "Delete this product; historical order snapshots are retained"
                                                                        : "Clear package components, carts and reviews before deleting catalog items"}
                                                                >
                                                                    <i className="bi bi-trash3 me-1" /> DELETE
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={products} label="products" insideCard />
                        </div>

                    </main>
                </div>
            </div>


            {productModalOpen && (
                <div
                    className="modal d-block admin-catalog-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="productModalTitle"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", zIndex: 1055 }}
                    onClick={(event) => {
                        if (event.target === event.currentTarget && !productForm.processing) {
                            setProductModalOpen(false);
                        }
                    }}
                >
                    <div className="modal-dialog modal-lg admin-catalog-modal-dialog admin-catalog-modal-dialog-product">
                        <div className="modal-content border-0 rounded-4 shadow admin-catalog-modal-content">
                            <form onSubmit={saveProduct}>
                                <div className="modal-header">
                                    <div>
                                        <div className="small text-muted">PRODUCT CATALOG</div>
                                        <h2 className="modal-title fs-5 fw-bold" id="productModalTitle">
                                            {editingProductId ? "Edit Product" : "Add Product"}
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={() => setProductModalOpen(false)}
                                        disabled={productForm.processing}
                                    />
                                </div>

                                <div className="modal-body">
                                    <p className="small text-muted mb-3">
                                        Product information appears in the customer catalog. Stock remains available for inventory adjustments after saving.
                                    </p>

                                    {productForm.errors.product && (
                                        <div className="alert alert-danger py-2">
                                            {productForm.errors.product}
                                        </div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-md-8">
                                            <label className="form-label fw-semibold">Product name *</label>
                                            <input
                                                className="form-control"
                                                value={productForm.data.name}
                                                onChange={(event) => productForm.setData("name", event.target.value)}
                                                maxLength={255}
                                                required
                                            />
                                            <FieldError message={productForm.errors.name} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Category *</label>
                                            <CatalogOptionSelect
                                                label="Category"
                                                value={productForm.data.category}
                                                options={categoryOptions}
                                                required
                                                error={productForm.errors.category}
                                                onChange={(value) => productForm.setData("category", value)}
                                            />
                                            <FieldError message={productForm.errors.category} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Price (₱) *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={productForm.data.price}
                                                onChange={(event) => productForm.setData("price", event.target.value)}
                                                min="0.01"
                                                max="99999999.99"
                                                step="0.01"
                                                required
                                            />
                                            <FieldError message={productForm.errors.price} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">
                                                Installation Fee (₱) <span className="text-muted fw-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="number"
                                                className={"form-control " + (productForm.errors.installation_fee ? "is-invalid" : "")}
                                                value={productForm.data.installation_fee}
                                                onChange={(event) => productForm.setData("installation_fee", event.target.value)}
                                                min="0"
                                                max="99999999.99"
                                                step="0.01"
                                                placeholder="Leave blank for free installation"
                                            />
                                            <div className="form-text">Blank or ₱0 means installation is free.</div>
                                            <FieldError message={productForm.errors.installation_fee} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">{editingProductId ? "Current stock *" : "Initial stock *"}</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={productForm.data.stock_quantity}
                                                onChange={(event) => productForm.setData("stock_quantity", event.target.value === "" ? "" : Math.max(0, Number(event.target.value)))}
                                                min="0"
                                                step="1"
                                                required
                                            />
                                            <FieldError message={productForm.errors.stock_quantity} />
                                        </div>

                                        {editingProductId && (
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Stock change reason (optional)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={productForm.data.stock_reason ?? ""}
                                                    onChange={(event) => productForm.setData("stock_reason", event.target.value)}
                                                    maxLength={255}
                                                    placeholder="e.g. Replenished stock, damaged units, or used for installation"
                                                />
                                                <FieldError message={productForm.errors.stock_reason} />
                                            </div>
                                        )}

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Warranty *</label>
                                            <CatalogOptionSelect
                                                label="Warranty"
                                                value={productForm.data.warranty}
                                                options={warrantyOptions}
                                                required
                                                error={productForm.errors.warranty}
                                                onChange={(value) => productForm.setData("warranty", value)}
                                            />
                                            <FieldError message={productForm.errors.warranty} />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Badge <span className="text-muted fw-normal">(optional)</span></label>
                                            <CatalogOptionSelect
                                                label="Badge"
                                                value={productForm.data.badge ?? ""}
                                                options={badgeOptions}
                                                allowBlank
                                                error={productForm.errors.badge}
                                                onChange={(value) => productForm.setData("badge", value)}
                                            />
                                            <FieldError message={productForm.errors.badge} />
                                        </div>

                                        <div className="col-md-6">
                                            <ImagePicker
                                                label="Product image (optional)"
                                                currentImages={productForm.data.existing_images}
                                                selectedFiles={productForm.data.image_files}
                                                onFilesChange={(files) => productForm.setData("image_files", files)}
                                                onRemoveImage={(image) => productForm.setData("existing_images", productForm.data.existing_images.filter((item) => item !== image))}
                                                error={productForm.errors.image_files || productForm.errors.image_file}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Specifications <span className="text-muted fw-normal">(one per line)</span></label>
                                            <textarea
                                                className="form-control"
                                                rows="4"
                                                value={(productForm.data.specifications ?? []).join("\n")}
                                                onChange={(event) => productForm.setData("specifications", event.target.value.split("\n"))}
                                                placeholder={"4K recording\nNight vision\nMobile viewing"}
                                            />
                                            <FieldError message={productForm.errors.specifications} />
                                            {Object.entries(productForm.errors)
                                                .filter(([key]) => key.startsWith("specifications."))
                                                .map(([key, message]) => (
                                                    <div key={key} className="small text-danger mt-1">{message}</div>
                                                ))}
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check">
                                                <input
                                                    id="productFeatured"
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={Boolean(productForm.data.is_featured)}
                                                    onChange={(event) => productForm.setData("is_featured", event.target.checked)}
                                                />
                                                <label className="form-check-label fw-semibold" htmlFor="productFeatured">
                                                    Feature this product in the customer catalog
                                                </label>
                                            </div>
                                            <FieldError message={productForm.errors.is_featured} />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setProductModalOpen(false)}
                                        disabled={productForm.processing}
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                        disabled={productForm.processing}
                                    >
                                        {productForm.processing
                                            ? "SAVING..."
                                            : editingProductId
                                                ? "SAVE CHANGES"
                                                : "ADD PRODUCT"}
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
