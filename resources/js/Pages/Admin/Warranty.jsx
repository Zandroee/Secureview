import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";

export default function AdminWarranty() {
    return (
        <div>
            <Navbar />
            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="warranty" />
                    </aside>
                    <main className="col-md-9 col-lg-10 p-3 p-md-4" style={{ backgroundColor: "#f5f6f8", minHeight: "75vh", fontFamily: "Outfit, sans-serif" }}>
                        <div className="small text-primary fw-bold">SECUREVIEW ADMIN</div>
                        <h1 className="fw-bold mb-2">WARRANTY</h1>
                        <p className="text-muted">Warranty tracking is not available yet. This section is reserved for future warranty records and service claims.</p>
                        <section className="bg-white border rounded-4 p-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 52, height: 52 }}>
                                    <i className="bi bi-shield-check fs-4" />
                                </div>
                                <div>
                                    <h2 className="h5 fw-bold mb-1">Warranty tracking coming soon</h2>
                                    <p className="text-muted mb-0">No warranty or warranty-service records are tracked by SecureView at this time.</p>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
}
