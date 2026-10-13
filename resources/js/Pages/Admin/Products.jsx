import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
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


function emptyProduct() {
    return {
        name: "",
        category: "",
        warranty: "1 year",
        price: "",
        stock_quantity: 0,
        badge: "",
        image: "",
        specifications: [],
        is_featured: false,
    };
}

function FieldError({ message }) {
    if (!message) return null;
    return <div className="small text-danger mt-1">{message}</div>;
}

export default function AdminProducts({
    products = [],
    packages = [],
    categories = [],
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
                products.map((product) => [
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
            stock_quantity: Number(product.stock_quantity ?? 0),
            badge: product.badge ?? "",
            image: product.image ?? "",
            specifications: Array.isArray(product.specifications) ? product.specifications : [],
            is_featured: Boolean(product.is_featured),
        });
        setProductModalOpen(true);
    };

    const saveProduct = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setProductModalOpen(false);
                setEditingProductId(null);
                productForm.reset();
            },
        };

        if (editingProductId) {
            productForm.patch("/admin/products/" + editingProductId, options);
        } else {
            productForm.post("/admin/products", options);
        }
    };

    const deleteProduct = (product) => {
        if (!product.can_delete) return;
        if (!window.confirm("Delete “" + product.name + "”? This cannot be undone.")) return;

        router.delete("/admin/products/" + product.id, {
            preserveScroll: true,
        });
    };

    useEffect(() => {
        setStockValues(
            Object.fromEntries(
                products.map((product) => [
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
                                    Add and maintain products, manage stock, and control package availability.
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
                                            <th className="ps-3">
                                                PRODUCT
                                            </th>
                                            <th>CATEGORY</th>
                                            <th>STOCK</th>
                                            <th>STATUS</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="5"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No products found.
                                                </td>
                                            </tr>
                                        ) : (
                                            products.map((product) => {
                                                const value =
                                                    stockValues[product.id] ??
                                                    0;

                                                return (
                                                    <tr key={product.id}>
                                                        <td className="ps-3">
                                                            <div className="fw-semibold">
                                                                {product.name}
                                                            </div>

                                                            <div className="small text-muted">
                                                                Product #{product.id}
                                                            </div>
                                                        </td>

                                                        <td className="text-capitalize">
                                                            {product.category}
                                                        </td>

                                                        <td style={{ minWidth: "150px" }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                className="form-control form-control-sm"
                                                                value={value}
                                                                onChange={(event) =>
                                                                    updateValue(
                                                                        product.id,
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    "badge rounded-pill px-3 py-2 " +
                                                                    stockClass(
                                                                        Number(
                                                                            value || 0
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                {stockLabel(
                                                                    Number(
                                                                        value || 0
                                                                    )
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td className="text-end pe-3">
                                                            <div className="d-flex justify-content-end flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm fw-bold"
                                                                    onClick={() => openEditProduct(product)}
                                                                >
                                                                    EDIT
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm fw-bold"
                                                                    onClick={() => updateStock(product)}
                                                                    disabled={savingId === product.id}
                                                                >
                                                                    {savingId === product.id ? "SAVING..." : "SAVE STOCK"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger btn-sm fw-bold"
                                                                    onClick={() => deleteProduct(product)}
                                                                    disabled={!product.can_delete}
                                                                    title={product.can_delete ? "Delete this product" : "Products referenced by packages, carts, orders, or reviews cannot be deleted"}
                                                                >
                                                                    DELETE
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
                        </div>

                        <div
                            className="bg-white border rounded-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="p-3 border-bottom">
                                <div className="fw-bold">
                                    PACKAGE AVAILABILITY
                                </div>

                                <div className="small text-muted">
                                    Package stock is calculated from its product
                                    components. Manage the components above to
                                    change package availability.
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">PACKAGE</th>
                                            <th>AVAILABLE</th>
                                            <th>STATUS</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {packages.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="3"
                                                    className="text-center text-muted py-4"
                                                >
                                                    No packages found.
                                                </td>
                                            </tr>
                                        ) : (
                                            packages.map((pkg) => (
                                                <tr key={pkg.id}>
                                                    <td className="ps-3 fw-semibold">
                                                        {pkg.name}
                                                    </td>

                                                    <td>
                                                        {pkg.available_stock}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill px-3 py-2 " +
                                                                stockClass(
                                                                    pkg.available_stock
                                                                )
                                                            }
                                                        >
                                                            {pkg.in_stock
                                                                ? "In Stock"
                                                                : "Out of Stock"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>


            {productModalOpen && (
                <div
                    className="modal d-block"
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
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-4 shadow">
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
                                            <input
                                                className="form-control"
                                                value={productForm.data.category}
                                                onChange={(event) => productForm.setData("category", event.target.value)}
                                                maxLength={120}
                                                placeholder="e.g. CCTV"
                                                required
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

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Warranty *</label>
                                            <input
                                                className="form-control"
                                                value={productForm.data.warranty}
                                                onChange={(event) => productForm.setData("warranty", event.target.value)}
                                                maxLength={120}
                                                placeholder="e.g. 1 year"
                                                required
                                            />
                                            <FieldError message={productForm.errors.warranty} />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Badge <span className="text-muted fw-normal">(optional)</span></label>
                                            <input
                                                className="form-control"
                                                value={productForm.data.badge ?? ""}
                                                onChange={(event) => productForm.setData("badge", event.target.value)}
                                                maxLength={80}
                                                placeholder="e.g. Best Seller"
                                            />
                                            <FieldError message={productForm.errors.badge} />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Image URL/path <span className="text-muted fw-normal">(optional)</span></label>
                                            <input
                                                className="form-control"
                                                value={productForm.data.image ?? ""}
                                                onChange={(event) => productForm.setData("image", event.target.value)}
                                                maxLength={255}
                                                placeholder="https://… or existing image path"
                                            />
                                            <FieldError message={productForm.errors.image} />
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
