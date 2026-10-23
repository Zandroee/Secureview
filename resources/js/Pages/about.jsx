import "../../css/whyline.css";
import Navbar from '../Components/navbar';
import Footer from '../Components/footer';
import { Link } from "@inertiajs/react";
import { useState } from "react";

const faqItems = [
    {
        question: "What can I find on SecureView?",
        answer: "SecureView is the online platform for Netmax Trading's CCTV products, packages, and related services. Browse the catalog to compare the available items and their listed details.",
    },
    {
        question: "What services can I request?",
        answer: "You can request Installation, Site Inspection, Maintenance, Repair, Consultation, or Other services. Choose the option that best matches what you need.",
    },
    {
        question: "How do I request a service?",
        answer: "Open the Services page and choose Book Service. Complete the service request form with your contact details, address, service type, and useful notes.",
    },
    {
        question: "Can I choose my preferred date and time?",
        answer: "Yes. The service request form lets you choose an available date and time slot. Your selection is submitted as a scheduling preference, so wait for confirmation before treating the appointment as final.",
    },
    {
        question: "Can you help me choose the right CCTV product or package?",
        answer: "Choose Consultation in the service request form and describe your location, coverage needs, or questions in the notes. You can also review product and package details before contacting the team.",
    },
    {
        question: "Can I purchase products and packages through the website?",
        answer: "You can browse Products and Packages, add items to your cart, and proceed to checkout. The cart and checkout require you to sign in with a verified account.",
    },
    {
        question: "Where does Netmax Trading operate?",
        answer: "The About page notes that the company has operated across Luzon, Visayas, and Mindanao. Availability for a specific installation or site visit can depend on location and service, so submit a service request to confirm.",
    },
    {
        question: "What if I need a service that is not listed?",
        answer: "Select Other in the service request form and explain what you need in the notes. The team can review the request and advise on the next step.",
    },
];

export default function About() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <>
        {/* HEADER SECTION */}
            <Navbar />
            <header className="about-hero text-white">
                <div className="container-fluid p-0">
                    <div className="row g-0">
                        <div className="col-12 position-relative text-center about-hero-media">
                            <img
                                src="/images/AboutHeader.jpg"
                                className="about-hero-image"
                                alt="CCTV security camera installation"
                            />
                            <div className="about-hero-copy position-absolute top-50 start-50 translate-middle text-center">
                                <p className="about-hero-eyebrow text-uppercase fw-bold mb-2">Netmax Trading · SecureView</p>
                                <h1 className="display-3 fw-bold mb-2">ABOUT US</h1>
                                <p className="about-hero-subtitle mb-0">Who are we?</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>   </header>

            {/* NETMAX Section */}
            <section className="about-story-section about-company-section">
                <div className="container">
                    <div className="row g-4 g-lg-5 align-items-center">
                        <div className="col-md-6 mb-2 mb-md-0 about-story-media">
                            <img src="/images/NETMAX.jpg" className="img-fluid rounded-4 about-story-image" alt="Netmax Trading CCTV and computer services"></img>
                        </div>
                        <div className="col-md-6 about-story-copy">
                            <p className="about-section-kicker mb-2">Who we are</p>
                            <h2 className="fw-bold mb-3 text-primary about-section-heading">NETMAX TRADING</h2>
                            <p className="about-section-lead mb-0">Netmax Trading brings over 10 years of experience in IT-related industries, with a focus on CCTV systems, surveillance equipment, auxiliary solutions, and established brand partnerships.</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="about-story-section about-mission-section">
                <div className="container">
                    <div className="row g-4 g-lg-5 align-items-center">
                        <div className="col-md-6 about-story-copy">
                            <p className="about-section-kicker mb-2">What guides us</p>
                            <h2 className="fw-bold mb-3 text-primary about-section-heading">OUR MISSION</h2>
                            <p className="about-section-lead mb-0">Our mission is to provide dependable products and services, exceed customer expectations, and build lasting relationships through trusted support and practical security solutions.</p>
                        </div>
                        <div className="col-md-6 about-story-media">
                            <img src="/images/OurMission.jpg" className="img-fluid rounded-4 about-story-image" alt="CCTV product solutions for customers"></img>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHY CHOOSE US — refine the existing four points without adding another section */}
            <section className="about-benefits-section py-5">
                <div className="container">
                    <div className="why-line"></div>
                    <div className="text-center mb-4 mb-lg-5">
                        <p className="about-section-kicker text-uppercase fw-bold mb-2">The SecureView difference</p>
                        <h2 className="fw-bold text-primary mb-0 about-benefits-heading">WHY CHOOSE US?</h2>
                    </div>

                    <div className="row g-3 g-lg-4 text-center justify-content-center about-benefits-grid">
                        <div className="col-12 col-sm-6 col-xl-3">
                            <article className="about-benefit-card h-100">
                                <div className="about-benefit-icon"><i className="bi bi-tools" aria-hidden="true"></i></div>
                                <h3 className="h5 fw-bold">Certified Technicians</h3>
                                <p className="mb-0">11 years of IT experience across computers and auxiliary systems.</p>
                            </article>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <article className="about-benefit-card h-100">
                                <div className="about-benefit-icon"><i className="bi bi-patch-check" aria-hidden="true"></i></div>
                                <h3 className="h5 fw-bold">PhilGEPS Certification</h3>
                                <p className="mb-0">PhilGEPS is the centralized electronic portal for government procurement information.</p>
                            </article>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <article className="about-benefit-card h-100">
                                <div className="about-benefit-icon"><i className="bi bi-camera-video" aria-hidden="true"></i></div>
                                <h3 className="h5 fw-bold">Brand Partnership</h3>
                                <p className="mb-0">Brand partnerships include CCTV names such as Hikvision, Dahua, and Uniview.</p>
                            </article>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <article className="about-benefit-card h-100">
                                <div className="about-benefit-icon"><i className="bi bi-geo-alt" aria-hidden="true"></i></div>
                                <h3 className="h5 fw-bold">Operated Nationwide</h3>
                                <p className="mb-0">Experience operating across Luzon, Visayas, and Mindanao.</p>
                            </article>
                        </div>
                    </div>
                </div>
            </section>

            {/* FREQUENTLY ASKED QUESTIONS */}
            <section className="about-faq-section py-5">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8 text-center mb-4">
                            <div className="why-line"></div>
                            <p className="small text-primary fw-bold text-uppercase mb-2">
                                Need to know more?
                            </p>
                            <h2
                                className="fw-bold text-primary mb-3"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                                FREQUENTLY ASKED QUESTIONS
                            </h2>
                            <p className="text-muted mb-0">
                                Find quick answers about our CCTV products, services, and booking process.
                            </p>
                        </div>
                    </div>

                    <div className="row justify-content-center">
                        <div className="col-lg-9">
                            <div className="about-faq-list">
                                {faqItems.map((item, index) => {
                                    const isOpen = openFaq === index;
                                    const answerId = "about-faq-answer-" + index;

                                    return (
                                        <div
                                            className={"about-faq-item " + (isOpen ? "is-open" : "")}
                                            key={item.question}
                                        >
                                            <button
                                                type="button"
                                                className="about-faq-question"
                                                aria-expanded={isOpen}
                                                aria-controls={answerId}
                                                onClick={() => setOpenFaq(isOpen ? null : index)}
                                            >
                                                <span>{item.question}</span>
                                                <i
                                                    className={"bi " + (isOpen ? "bi-chevron-up" : "bi-chevron-down")}
                                                    aria-hidden="true"
                                                />
                                            </button>

                                            {isOpen && (
                                                <div className="about-faq-answer" id={answerId}>
                                                    {item.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="about-faq-cta text-center mt-4 p-4 rounded-3">
                                <h3 className="fw-bold mb-2">Still have questions?</h3>
                                <p className="text-muted mb-3">
                                    Send us a service request and tell us what kind of CCTV help you need.
                                </p>
                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                    <Link href="/services" className="btn btn-outline-primary fw-bold px-4">
                                        VIEW SERVICES
                                    </Link>
                                    <Link href="/inquiry" className="btn btn-primary fw-bold px-4">
                                        REQUEST A SERVICE
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}