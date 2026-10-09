import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router } from "@inertiajs/react";
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

export default function AdminProducts({
    products = [],
    packages = [],
    categories = [],
    summary = {},
    filters = {},
    success = "",
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
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">
                                SECUREVIEW ADMIN
                            </div>

                            <h1 className="fw-bold mb-1">
                                PRODUCT INVENTORY
                            </h1>

                            <div className="small text-muted">
                                Manage product stock used by customer purchases
                                and package availability.
                            </div>
                        </div>

                        {success && (
                            <div className="alert alert-success">
                                {success}
                            </div>
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
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm fw-bold"
                                                                onClick={() =>
                                                                    updateStock(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    savingId ===
                                                                    product.id
                                                                }
                                                            >
                                                                {savingId ===
                                                                product.id
                                                                    ? "SAVING..."
                                                                    : "SAVE"}
                                                            </button>
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

            <Footer />
        </div>
    );
}
