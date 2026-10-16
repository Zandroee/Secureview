import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import StaffSidebar from "../../Components/Staff/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { router } from "@inertiajs/react";
import { useState } from "react";

export default function StaffInventory({ products = {}, filters = {}, summary = {} }) {
    const rows = products.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");
    const [stockFilter, setStockFilter] = useState(filters.stock ?? "all");
    const [editingProduct, setEditingProduct] = useState(null);
    const [newQuantity, setNewQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");

    const filter = (event) => {
        event.preventDefault();
        router.get("/staff/inventory", { search, stock: stockFilter }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openAdjustment = (product) => {
        setEditingProduct(product);
        setNewQuantity(String(product.stock_quantity));
        setReason("");
        setErrors({});
        setMessage("");
    };

    const saveAdjustment = (event) => {
        event.preventDefault();
        if (!editingProduct) return;

        router.patch("/staff/inventory/" + editingProduct.id + "/stock", {
            stock_quantity: newQuantity,
            reason,
        }, {
            preserveScroll: true,
            onError: (validationErrors) => setErrors(validationErrors),
            onSuccess: () => {
                setEditingProduct(null);
                setMessage("Inventory adjustment saved.");
            },
        });
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0"><StaffSidebar active="inventory" /></aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">SECUREVIEW STAFF</div>
                            <h1 className="fw-bold mb-1">INVENTORY</h1>
                            <p className="text-muted small mb-0">View products and adjust stock quantities. Product details, pricing, and catalog structure can only be changed by administrators.</p>
                        </div>
                        <div className="row g-3 mb-4">
                            {[
                                ["PRODUCTS", summary.products ?? 0, "text-primary"],
                                ["LOW STOCK (1–5)", summary.low_stock ?? 0, "text-warning-emphasis"],
                                ["OUT OF STOCK", summary.out_of_stock ?? 0, "text-danger"],
                            ].map(([label, value, color]) => (
                                <div className="col-6 col-xl-4" key={label}>
                                    <div className="bg-white border rounded-3 p-3 h-100">
                                        <div className="small text-muted">{label}</div>
                                        <div className={"h4 fw-bold mb-0 " + color}>{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {message && <div className="alert alert-success">{message}</div>}
                        <form onSubmit={filter} className="bg-white border rounded-3 p-3 mb-3 row g-2 align-items-end">
                            <div className="col-md-6">
                                <label className="form-label small fw-semibold">SEARCH INVENTORY</label>
                                <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product name or category" />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold">STOCK STATUS</label>
                                <select className="form-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                                    <option value="all">All stock</option>
                                    <option value="low">Low stock</option>
                                    <option value="out">Out of stock</option>
                                </select>
                            </div>
                            <div className="col-md-3 d-flex gap-2">
                                <button type="submit" className="btn btn-primary fw-bold flex-fill">FILTER</button>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => { setSearch(""); setStockFilter("all"); router.get("/staff/inventory", {}, { preserveScroll: true, replace: true }); }}>CLEAR</button>
                            </div>
                        </form>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th className="ps-3">PRODUCT</th><th>CATEGORY</th><th>STOCK</th><th>STATUS</th><th className="text-end pe-3">ACTION</th></tr>
                                    </thead>
                                    <tbody>
                                        {rows.length ? rows.map((product) => (
                                            <tr key={product.id}>
                                                <td className="ps-3">
                                                    <div className="fw-semibold">{product.name}</div>
                                                    <div className="small text-muted">SKU / ID: {product.id}</div>
                                                </td>
                                                <td>{product.category}</td>
                                                <td className="fw-bold">{product.stock_quantity}</td>
                                                <td>
                                                    {product.stock_quantity === 0
                                                        ? <span className="badge bg-danger-subtle text-danger">Out of stock</span>
                                                        : product.low_stock
                                                            ? <span className="badge bg-warning-subtle text-warning-emphasis">Low stock</span>
                                                            : <span className="badge bg-success-subtle text-success">In stock</span>}
                                                </td>
                                                <td className="text-end pe-3">
                                                    <button type="button" className="btn btn-outline-primary btn-sm fw-bold" onClick={() => openAdjustment(product)}>ADJUST STOCK</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="text-center text-muted py-5">No products found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={products} label="products" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />

            {editingProduct && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ backgroundColor: "rgba(15, 23, 42, 0.58)", zIndex: 2000 }}>
                    <div className="bg-white shadow-lg rounded-4 w-100 p-4" style={{ maxWidth: 480 }}>
                        <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                            <div>
                                <div className="small text-muted">INVENTORY ADJUSTMENT</div>
                                <h2 className="h4 fw-bold mb-0">{editingProduct.name}</h2>
                            </div>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditingProduct(null)} />
                        </div>
                        <form onSubmit={saveAdjustment}>
                            <label className="form-label fw-semibold" htmlFor="new-stock-quantity">New stock quantity</label>
                            <input id="new-stock-quantity" type="number" min="0" max="1000000" required className={"form-control mb-1" + (errors.stock_quantity ? " is-invalid" : "")} value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} />
                            {errors.stock_quantity && <div className="invalid-feedback d-block mb-2">{errors.stock_quantity}</div>}

                            <label className="form-label fw-semibold mt-3" htmlFor="stock-adjustment-reason">Reason for adjustment</label>
                            <textarea id="stock-adjustment-reason" required maxLength="255" rows="3" className={"form-control" + (errors.reason ? " is-invalid" : "")} placeholder="e.g. Used 2 cameras for installation, received new shipment, stock count correction" value={reason} onChange={(event) => setReason(event.target.value)} />
                            {errors.reason && <div className="invalid-feedback d-block">{errors.reason}</div>}
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingProduct(null)}>CANCEL</button>
                                <button type="submit" className="btn btn-primary fw-bold">SAVE ADJUSTMENT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
