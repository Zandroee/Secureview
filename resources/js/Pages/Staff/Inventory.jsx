import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import StaffSidebar from "../../Components/Staff/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";

function StockAdjustmentForm({ product }) {
    const [quantity, setQuantity] = useState(String(product.stock_quantity));
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});
    const [working, setWorking] = useState(false);

    const submit = (event) => {
        event.preventDefault();
        setWorking(true);
        setErrors({});

        router.patch("/staff/inventory/" + product.id + "/stock", {
            stock_quantity: Number(quantity),
            reason,
        }, {
            preserveScroll: true,
            onError: (errorBag) => setErrors(errorBag),
            onSuccess: () => setReason(""),
            onFinish: () => setWorking(false),
        });
    };

    return (
        <form onSubmit={submit} className="d-flex flex-column gap-2" style={{ minWidth: "250px" }}>
            <div className="input-group input-group-sm">
                <span className="input-group-text">Units</span>
                <input type="number" className={"form-control" + (errors.stock_quantity ? " is-invalid" : "")} min="0" max="1000000" required value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label={"New quantity for " + product.name} />
            </div>
            {errors.stock_quantity && <div className="small text-danger">{errors.stock_quantity}</div>}
            <input type="text" className={"form-control form-control-sm" + (errors.reason ? " is-invalid" : "")} maxLength="255" required placeholder="Reason for stock change" value={reason} onChange={(event) => setReason(event.target.value)} aria-label={"Reason for updating " + product.name} />
            {errors.reason && <div className="small text-danger">{errors.reason}</div>}
            <button type="submit" className="btn btn-outline-primary btn-sm fw-bold" disabled={working || Number(quantity) === product.stock_quantity || !reason.trim()}>
                {working ? "SAVING..." : "SAVE STOCK"}
            </button>
        </form>
    );
}

export default function StaffInventory({ products = [], filters = {}, success }) {
    const { props } = usePage();
    const productRows = products.data ?? [];
    const [search, setSearch] = useState(filters.search ?? "");

    const applyFilters = (event) => {
        event.preventDefault();
        router.get("/staff/inventory", { search }, { preserveState: true, preserveScroll: true, replace: true });
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
                            <div className="small text-muted">View product stock and record stock changes. Product pricing and catalog management are restricted to admins.</div>
                        </div>

                        {(success || props.flash?.success) && <div className="alert alert-success">{success || props.flash.success}</div>}
                        {props.errors?.stock && <div className="alert alert-danger">{props.errors.stock}</div>}

                        <div className="bg-white border rounded-3 p-3 mb-3">
                            <form className="row g-2 align-items-end" onSubmit={applyFilters}>
                                <div className="col-md-8">
                                    <label htmlFor="inventory-search" className="form-label small fw-semibold mb-1">SEARCH INVENTORY</label>
                                    <input id="inventory-search" className="form-control" placeholder="Product or category" value={search} onChange={(event) => setSearch(event.target.value)} />
                                </div>
                                <div className="col-md-2 d-grid"><button type="submit" className="btn btn-primary fw-bold">SEARCH</button></div>
                                <div className="col-md-2 d-grid"><button type="button" className="btn btn-outline-primary fw-bold" onClick={() => { setSearch(""); router.get("/staff/inventory", {}, { preserveState: true, preserveScroll: true, replace: true }); }}>CLEAR</button></div>
                            </form>
                        </div>

                        <div className="bg-white border rounded-3 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th className="ps-3">PRODUCT</th><th>CATEGORY</th><th>STOCK</th><th className="pe-3">ADJUST STOCK</th></tr>
                                    </thead>
                                    <tbody>
                                        {productRows.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center text-muted py-5">No products found.</td></tr>
                                        ) : productRows.map((product) => (
                                            <tr key={product.id}>
                                                <td className="ps-3">
                                                    <div className="fw-semibold">{product.name}</div>
                                                </td>
                                                <td>{product.category}</td>
                                                <td>
                                                    <span className={"badge rounded-pill " + (product.stock_quantity <= 0 ? "bg-danger-subtle text-danger" : product.stock_quantity <= 5 ? "bg-warning-subtle text-warning-emphasis" : "bg-success-subtle text-success")}>
                                                        {product.stock_quantity <= 0 ? "Out of Stock" : product.stock_quantity <= 5 ? "Low Stock" : "In Stock"} · {product.stock_quantity}
                                                    </span>
                                                </td>
                                                <td className="pe-3"><StockAdjustmentForm product={product} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={products} label="products" insideCard />
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
