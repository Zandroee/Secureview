import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const money = (value) => "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function WalkIn({
    catalogItems = [],
    customers = [],
    bookingTimeSlots = [],
    todayDate,
    urgencyFees = {},
}) {
    const { props } = usePage();
    const [cart, setCart] = useState([]);
    const [sale, setSale] = useState({
        customer_user_id: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        payment_method: "cash",
        notes: "",
    });
    const [service, setService] = useState({
        customer_user_id: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        service_type: "Repair",
        service_location_type: "in_shop",
        street_address: "",
        address_details: "",
        city: "",
        preferred_date: todayDate || "",
        preferred_time: bookingTimeSlots[0] || "",
        urgency: "normal",
        item_name: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState("");

    const total = useMemo(
        () => cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
        [cart]
    );

    const addItem = (item) => {
        if (Number(item.stock) < 1) return;
        setCart((current) => {
            const existing = current.find((row) => row.type === item.type && row.id === item.id);
            if (existing) {
                return current.map((row) =>
                    row.type === item.type && row.id === item.id
                        ? { ...row, quantity: Math.min(Number(row.quantity) + 1, Number(item.stock)) }
                        : row
                );
            }
            return [...current, { ...item, quantity: 1 }];
        });
    };

    const updateQuantity = (item, quantity) => {
        setCart((current) => current.map((row) =>
            row.type === item.type && row.id === item.id
                ? { ...row, quantity: Math.max(1, Math.min(Number(quantity) || 1, Number(row.stock))) }
                : row
        ));
    };

    const submitSale = (event) => {
        event.preventDefault();
        if (!cart.length || submitting) return;
        setSubmitting("sale");
        router.post("/admin/walk-in/sales", {
            ...sale,
            items: cart.map(({ type, id, quantity }) => ({ type, id, quantity })),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSale({ customer_user_id: "", customer_name: "", customer_phone: "", customer_email: "", payment_method: "cash", notes: "" });
            },
            onFinish: () => setSubmitting(""),
        });
    };

    const submitService = (event) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting("service");
        router.post("/admin/walk-in/services", service, {
            preserveScroll: true,
            onSuccess: () => setService({
                customer_user_id: "",
                customer_name: "",
                customer_phone: "",
                customer_email: "",
                service_type: "Repair",
                service_location_type: "in_shop",
                street_address: "",
                address_details: "",
                city: "",
                preferred_date: todayDate || "",
                preferred_time: bookingTimeSlots[0] || "",
                urgency: "normal",
                item_name: "",
                notes: "",
            }),
            onFinish: () => setSubmitting(""),
        });
    };

    const setSaleField = (field, value) => setSale((current) => ({ ...current, [field]: value }));
    const setServiceField = (field, value) => setService((current) => ({ ...current, [field]: value }));
    const chooseServiceCustomer = (id) => {
        const customer = customers.find((row) => String(row.id) === String(id));
        setService((current) => ({
            ...current,
            customer_user_id: id,
            customer_name: customer?.name ?? "",
            customer_phone: customer?.phone ?? "",
            customer_email: customer?.email ?? "",
        }));
    };

    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="walk-in" />
                    </aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-4">
                            <div>
                                <div className="small text-primary fw-bold">NETMAX TRADING ADMIN</div>
                                <h1 className="fw-bold mb-1">WALK-IN POS & SERVICE INTAKE</h1>
                                <div className="small text-muted">Record physical-store sales and customer service bookings in SecureView.</div>
                            </div>
                            <span className="badge text-bg-primary align-self-start align-self-lg-center">Staff workspace</span>
                        </div>

                        {props.flash?.success && <div className="alert alert-success">{props.flash.success}{props.flash?.sale_invoice_url && <div className="mt-2"><a className="alert-link fw-semibold" href={props.flash.sale_invoice_url} target="_blank" rel="noreferrer"><i className="bi bi-printer me-1"></i>Open / print invoice for {props.flash.sale_order_number}</a></div>}</div>}
                        {Object.keys(props.errors || {}).length > 0 && (
                            <div className="alert alert-danger">
                                <div className="fw-semibold mb-1">Please review the following:</div>
                                <ul className="mb-0">{Object.values(props.errors).map((error, index) => <li key={index}>{error}</li>)}</ul>
                            </div>
                        )}

                        <div className="row g-3 align-items-start">
                            <div className="col-12 col-xxl-7">
                                <section className="bg-white border rounded-3 p-3 p-lg-4 mb-3">
                                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                        <div>
                                            <h2 className="h5 fw-bold mb-1">Walk-in product sale</h2>
                                            <p className="small text-muted mb-0">For products or packages purchased and handed over at the physical shop.</p>
                                        </div>
                                        <i className="bi bi-cart-check fs-3 text-primary" aria-hidden="true"></i>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        {catalogItems.map((item) => (
                                            <div className="col-12 col-md-6" key={item.type + "-" + item.id}>
                                                <div className="border rounded-3 p-3 h-100 d-flex flex-column">
                                                    <div className="d-flex justify-content-between gap-2">
                                                        <div className="fw-semibold">{item.name}</div>
                                                        <span className="badge text-bg-light text-dark">{item.type}</span>
                                                    </div>
                                                    <div className="text-primary fw-bold mt-1">{money(item.price)}</div>
                                                    <div className="small text-muted mb-2">Available stock: {item.stock}</div>
                                                    <button type="button" className="btn btn-outline-primary btn-sm mt-auto" disabled={Number(item.stock) < 1} onClick={() => addItem(item)}>
                                                        <i className="bi bi-plus-lg me-1"></i>Add to sale
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {catalogItems.length === 0 && <div className="col-12 text-muted small">No products or packages are currently available.</div>}
                                    </div>

                                    <form onSubmit={submitSale}>
                                        <div className="mb-3">
                                            <label className="form-label">Existing customer account (optional)</label>
                                            <select className="form-select" value={sale.customer_user_id} onChange={(event) => chooseSaleCustomer(event.target.value)}>
                                                <option value="">Guest customer / no account</option>
                                                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}
                                            </select>
                                            <div className="small text-muted mt-1">Linking an account makes this purchase available in the customer's online order history.</div>
                                        </div>
                                        <h3 className="h6 fw-bold">Sale items</h3>
                                        {cart.length ? (
                                            <div className="table-responsive mb-3">
                                                <table className="table table-sm align-middle">
                                                    <thead><tr><th>Item</th><th style={{ width: 105 }}>Qty</th><th className="text-end">Amount</th><th></th></tr></thead>
                                                    <tbody>
                                                        {cart.map((item) => (
                                                            <tr key={item.type + "-" + item.id}>
                                                                <td><div className="fw-semibold">{item.name}</div><div className="small text-muted">{money(item.price)} each</div></td>
                                                                <td><input aria-label={"Quantity for " + item.name} className="form-control form-control-sm" type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => updateQuantity(item, event.target.value)} /></td>
                                                                <td className="text-end fw-semibold">{money(item.price * item.quantity)}</td>
                                                                <td><button type="button" className="btn btn-sm btn-outline-danger" aria-label={"Remove " + item.name} onClick={() => setCart((current) => current.filter((row) => row.type !== item.type || row.id !== item.id))}><i className="bi bi-trash"></i></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <div className="alert alert-light border small">Add at least one product or package to begin a sale.</div>}

                                        <div className="row g-2">
                                            <div className="col-md-6"><label className="form-label">Customer name *</label><input className="form-control" required maxLength="120" value={sale.customer_name} onChange={(e) => setSaleField("customer_name", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Contact number</label><input className="form-control" maxLength="30" value={sale.customer_phone} onChange={(e) => setSaleField("customer_phone", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Email (optional)</label><input type="email" className="form-control" value={sale.customer_email} onChange={(e) => setSaleField("customer_email", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Payment method *</label><select className="form-select" value={sale.payment_method} onChange={(e) => setSaleField("payment_method", e.target.value)}><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option><option value="maya">Maya</option></select></div>
                                            <div className="col-12"><label className="form-label">Notes (optional)</label><textarea className="form-control" rows="2" value={sale.notes} onChange={(e) => setSaleField("notes", e.target.value)} /></div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
                                            <div><div className="small text-muted">TOTAL DUE</div><div className="h4 fw-bold text-success mb-0">{money(total)}</div></div>
                                            <button className="btn btn-primary fw-semibold" type="submit" disabled={!cart.length || !sale.customer_name.trim() || submitting !== ""}>
                                                {submitting === "sale" ? "Recording..." : "Record paid sale"}
                                            </button>
                                        </div>
                                        <div className="small text-muted mt-2">Submitting records payment as received and deducts stock. Confirm the customer's payment before submitting.</div>
                                    </form>
                                </section>
                            </div>

                            <div className="col-12 col-xxl-5">
                                <section className="bg-white border rounded-3 p-3 p-lg-4">
                                    <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                        <div>
                                            <h2 className="h5 fw-bold mb-1">Walk-in service booking</h2>
                                            <p className="small text-muted mb-0">Create a service request for a customer at the counter.</p>
                                        </div>
                                        <i className="bi bi-calendar2-check fs-3 text-primary" aria-hidden="true"></i>
                                    </div>
                                    <form onSubmit={submitService}>
                                        <div className="mb-2">
                                            <label className="form-label">Existing customer account (optional)</label>
                                            <select className="form-select" value={service.customer_user_id} onChange={(event) => chooseServiceCustomer(event.target.value)}>
                                                <option value="">Guest customer / no account</option>
                                                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}
                                            </select>
                                            <div className="small text-muted mt-1">Linking an account lets the customer see this service and its invoice after signing in.</div>
                                        </div>
                                        <div className="row g-2">
                                            <div className="col-12"><label className="form-label">Customer name *</label><input className="form-control" required maxLength="120" value={service.customer_name} onChange={(e) => setServiceField("customer_name", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Mobile number *</label><input className="form-control" required placeholder="09XXXXXXXXX" value={service.customer_phone} onChange={(e) => setServiceField("customer_phone", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Email (optional)</label><input type="email" className="form-control" value={service.customer_email} onChange={(e) => setServiceField("customer_email", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Service type *</label><select className="form-select" value={service.service_type} onChange={(e) => setServiceField("service_type", e.target.value)}>{["Installation", "Site Inspection", "Maintenance", "Repair", "Consultation", "Other"].map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                                            <div className="col-md-6"><label className="form-label">Service location *</label><select className="form-select" value={service.service_location_type} onChange={(e) => setServiceField("service_location_type", e.target.value)}><option value="in_shop">In-shop drop-off</option><option value="customer_site">Customer site visit</option></select></div>
                                            {service.service_location_type === "customer_site" && <>
                                                <div className="col-12"><label className="form-label">Street address *</label><input className="form-control" required value={service.street_address} onChange={(e) => setServiceField("street_address", e.target.value)} /></div>
                                                <div className="col-md-6"><label className="form-label">City *</label><input className="form-control" required value={service.city} onChange={(e) => setServiceField("city", e.target.value)} /></div>
                                                <div className="col-md-6"><label className="form-label">Address details</label><input className="form-control" value={service.address_details} onChange={(e) => setServiceField("address_details", e.target.value)} /></div>
                                            </>}
                                            <div className="col-md-6"><label className="form-label">Preferred date *</label><input type="date" min={todayDate} className="form-control" required value={service.preferred_date} onChange={(e) => setServiceField("preferred_date", e.target.value)} /></div>
                                            <div className="col-md-6"><label className="form-label">Preferred time *</label><select className="form-select" required value={service.preferred_time} onChange={(e) => setServiceField("preferred_time", e.target.value)}>{bookingTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></div>
                                            <div className="col-md-6"><label className="form-label">Priority</label><select className="form-select" value={service.urgency} onChange={(e) => setServiceField("urgency", e.target.value)}><option value="normal">Normal</option><option value="urgent">Urgent ({money(urgencyFees.urgent)})</option><option value="emergency">Emergency ({money(urgencyFees.emergency)})</option></select></div>
                                            <div className="col-md-6"><label className="form-label">Device / item (optional)</label><input className="form-control" placeholder="e.g. 4-channel DVR" value={service.item_name} onChange={(e) => setServiceField("item_name", e.target.value)} /></div>
                                            <div className="col-12"><label className="form-label">Service notes</label><textarea className="form-control" rows="2" value={service.notes} onChange={(e) => setServiceField("notes", e.target.value)} /></div>
                                        </div>
                                        <button className="btn btn-primary fw-semibold w-100 mt-3" type="submit" disabled={submitting !== ""}>
                                            {submitting === "service" ? "Submitting..." : "Create walk-in service request"}
                                        </button>
                                        <div className="small text-muted mt-2">The request enters the existing admin review, scheduling, and technician assignment workflow. It is not automatically confirmed.</div>
                                    </form>
                                </section>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
