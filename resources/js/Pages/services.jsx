import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { Link } from "@inertiajs/react";

const services = [
    {
        title: "Installation",
        description:
            "Professional CCTV installation and setup for your home or business.",
        icon: "bi-camera-video",
    },
    {
        title: "Site Inspection",
        description:
            "Assess your location and identify suitable areas for CCTV coverage.",
        icon: "bi-geo-alt",
    },
    {
        title: "Maintenance",
        description:
            "Keep your CCTV system checked, maintained, and ready for use.",
        icon: "bi-tools",
    },
    {
        title: "Repair",
        description:
            "Get assistance with CCTV equipment and system issues.",
        icon: "bi-wrench-adjustable",
    },
    {
        title: "Consultation",
        description:
            "Get guidance on products, packages, and CCTV solutions for your needs.",
        icon: "bi-chat-left-text",
    },
    {
        title: "Other",
        description:
            "Have a service request that does not fit the options above? Let us know.",
        icon: "bi-three-dots",
    },
];

export default function Services() {
    return (
        <div>
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f5f6f8",
                    minHeight: "65vh",
                    fontFamily: "Outfit, sans-serif",
                }}
            >
                <section className="bg-primary text-white py-5">
                    <div className="container">
                        <div className="row justify-content-center text-center">
                            <div className="col-lg-8">
                                <div className="small fw-bold mb-2">
                                    SECUREVIEW
                                </div>

                                <h1 className="fw-bold display-5 mb-3">
                                    OUR SERVICES
                                </h1>

                                <p className="lead mb-0">
                                    Professional CCTV services to help you
                                    secure your home or business.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-5">
                    <div className="container">
                        <div className="row g-3 g-md-4">
                            {services.map((service) => (
                                <div className="col-md-6 col-xl-4" key={service.title}>
                                    <div
                                        className="bg-white border rounded-3 h-100 p-4"
                                        style={{
                                            boxShadow:
                                                "0 3px 12px rgba(0,0,0,0.06)",
                                        }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mb-3"
                                            style={{
                                                width: "52px",
                                                height: "52px",
                                                fontSize: "1.35rem",
                                            }}
                                        >
                                            <i className={"bi " + service.icon}></i>
                                        </div>

                                        <h3
                                            className="fw-bold mb-2"
                                            style={{
                                                fontSize: "1.1rem",
                                            }}
                                        >
                                            {service.title}
                                        </h3>

                                        <p className="text-muted small mb-4">
                                            {service.description}
                                        </p>

                                        <Link
                                            href="/inquiry"
                                            className="btn btn-outline-primary btn-sm fw-bold"
                                        >
                                            BOOK SERVICE
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-5">
                            <p className="text-muted mb-3">
                                Need a CCTV service? Submit an inquiry and
                                choose your preferred schedule.
                            </p>

                            <Link
                                href="/inquiry"
                                className="btn btn-primary fw-bold px-4"
                            >
                                MAKE AN INQUIRY
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
