import Navbar from "../Components/Navbar";
import Footer from "../Components/footer";
import PackageCard from "../Components/PackageCard";
import ProductCard from "../Components/ProductCard";

import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function FeaturedNavigation({ currentPage, totalPages, onPrevious, onNext }) {
    if (totalPages <= 1) return null;

    return (
        <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
            <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: "44px", height: "44px", color: currentPage === 1 ? "#adb5bd" : "#0d6efd" }} disabled={currentPage === 1} onClick={onPrevious} aria-label="Previous">
                <i className="bi bi-chevron-left fs-5"></i>
            </button>

            <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: "44px", height: "44px", color: currentPage === totalPages ? "#adb5bd" : "#0d6efd" }} disabled={currentPage === totalPages} onClick={onNext} aria-label="Next">
                <i className="bi bi-chevron-right fs-5"></i>
            </button>
        </div>
    );
}

export default function Landing({ cctvPackages = [], cameras = [] }) {
    const [packagePage, setPackagePage] = useState(1);
    const [cameraPage, setCameraPage] = useState(1);

    const packagesPerPage = 3;
    const camerasPerPage = 4;

    const totalPackagePages = Math.ceil(cctvPackages.length / packagesPerPage);
    const packageStartIndex = (packagePage - 1) * packagesPerPage;
    const currentPackages = cctvPackages.slice(packageStartIndex, packageStartIndex + packagesPerPage);

    const totalCameraPages = Math.ceil(cameras.length / camerasPerPage);
    const cameraStartIndex = (cameraPage - 1) * camerasPerPage;
    const currentCameras = cameras.slice(cameraStartIndex, cameraStartIndex + camerasPerPage);

    return (
        <>
            <Navbar />

            <header className="bg-primary text-white">
                <div className="container-fluid px-0">
                    <div className="row g-0">
                        <div className="col-lg-6">
                            <img src="/images/cctv-cameras.jpg" alt="CCTV Cameras" className="img-fluid w-100" style={{ height: "600px", objectFit: "cover", objectPosition: "center" }} />
                        </div>

                        <div className="col-lg-6 d-flex align-items-center">
                            <div className="w-100 text-center px-4 px-md-5 py-5" style={{ fontFamily: "Outfit, sans-serif" }}>
                                <h1 className="display-3 fw-bold mb-4">Secure your home or your business</h1>
                                <p className="display-6 mb-5">Secure them with our optimal CCTV packages offers just for you!</p>

                                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <a href="#featured-packages" className="btn btn-light text-primary fw-bold fs-5 px-5 py-2">VIEW PACKAGES</a>
                                    <Link href="/products" className="btn btn-outline-light fw-bold fs-5 px-5 py-2">BROWSE CAMERAS</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <section id="featured-packages" className="text-dark py-5">
                <div className="container-fluid px-3 px-md-4 px-lg-5">
                    <div className="row align-items-end mb-4">
                        <div className="col">
                            <h2 className="display-6 fw-bold mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>Featured CCTV Packages</h2>
                        </div>

                        <div className="col-auto">
                            <Link href="/packages" className="text-primary fw-bold text-decoration-none">VIEW ALL <i className="bi bi-arrow-right ms-2"></i></Link>
                        </div>
                    </div>

                    <div className="row g-3 g-md-4">
                        {currentPackages.map((pkg) => (
                            <div className="col-sm-6 col-lg-4" key={pkg.id}>
                                <PackageCard name={pkg.name} image={pkg.image} price={pkg.price} badge={pkg.badge} specifications={pkg.specifications} rating={pkg.rating} onDetails={() => router.visit(`/packages/${pkg.id}`)} />
                            </div>
                        ))}
                    </div>

                    <FeaturedNavigation currentPage={packagePage} totalPages={totalPackagePages} onPrevious={() => setPackagePage(packagePage - 1)} onNext={() => setPackagePage(packagePage + 1)} />
                </div>
            </section>

            <section id="featured-cameras" className="text-dark bg-light py-5">
                <div className="container-fluid px-3 px-md-4 px-lg-5">
                    <div className="row align-items-end mb-4">
                        <div className="col">
                            <h2 className="display-6 fw-bold mb-0" style={{ fontFamily: "Outfit, sans-serif" }}>Featured Cameras</h2>
                        </div>

                        <div className="col-auto">
                            <Link href="/products" className="text-primary fw-bold text-decoration-none">VIEW ALL <i className="bi bi-arrow-right ms-2"></i></Link>
                        </div>
                    </div>

                    <div className="row g-3 g-md-4">
                        {currentCameras.map((product) => (
                            <div className="col-sm-6 col-xl-3" key={product.id}>
                                <ProductCard name={product.name} image={product.image} price={product.price} badge={product.badge} specifications={product.specifications} rating={product.rating} onDetails={() => router.visit(`/products/${product.id}`)} />
                            </div>
                        ))}
                    </div>

                    <FeaturedNavigation currentPage={cameraPage} totalPages={totalCameraPages} onPrevious={() => setCameraPage(cameraPage - 1)} onNext={() => setCameraPage(cameraPage + 1)} />
                </div>
            </section>

            <section className="py-5">
                <div className="container">
                    <div className="bg-primary text-white rounded-3 p-4 p-md-5">
                        <div className="row align-items-center">
                            <div className="col-lg-8 text-center text-lg-start">
                                <h2 className="fw-bold mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Ready to secure your space?</h2>
                                <p className="mb-0">Browse our CCTV cameras and packages to find the right security solution.</p>
                            </div>

                            <div className="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
                                <Link href="/products" className="btn btn-light text-primary fw-bold px-4 py-2">BROWSE PRODUCTS <i className="bi bi-arrow-right ms-2"></i></Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}