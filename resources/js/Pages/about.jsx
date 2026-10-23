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
            <header className="d-flex align-items-center text-white">
                <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="row">

                        <div className="col-12 position-relative text-center">
                            <img src="/images/AboutHeader.jpg" className="img-fluid" style={{ width: "100%", height: "400px", objectFit: "cover" }} alt="AboutHeader"></img>
                        
                        <div
                        className="position-absolute top-50 start-50 translate-middle text-center" style ={{marginTop: "50px"}}>
                            <h1 className="display-4 fw-bold">ABOUT US</h1> 

                            <p className="lead" style={{ color: "white", fontSize: "1.25rem", marginTop: "-10px" }}>who are we?</p>
                        </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* NETMAX Section */}
            <section className="py-5">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-4 mb-md-0">
                            <img src="/images/NETMAX.jpg" className="img-fluid rounded" alt="AboutUs"></img>
                        </div>
                        <div className="col-md-6">
                            <h2 className="fw-bold mb-4 text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>NETMAX TRADING</h2>
                            <p className="lead mb-4" style = {{ fontFamily: "Outfit, sans-serif," }}>Our company, Netmax Trading, are experts in IT industries with over 10+ years of experiences in this field. We specialize in CCTV operations as well as different Auxilliaries with several brand partnerships.</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-5">  
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-4 mb-md-0">
                            <h2 className="fw-bold mb-4 text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>OUR MISSION</h2>
                            <p className="lead mb-4" style = {{ fontFamily: "Outfit, sans-serif," }}>Our mission is to provide our customers with the best products and services in the industry. We strive to exceed our customers' expectations and to be a trusted partner in their success.</p>
                        </div>
                        <div className="col-md-6">
                            <img src="/images/OurMission.jpg" className="img-fluid rounded" alt="Mission"></img>
                        </div>
                    </div>
                </div>
            </section>

            {/* NETMAX Section */}
            <section className="py-5">
                <div className="container-fluid">

                    <div className="why-line"></div>
                    <h3 className="fw-bold mb-4 text-center text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>WHY CHOOSE US?</h3>

                <div className="row text-center justify-content-center">
                    <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Certified Technicians</h3>
                        <p>With 11 years of IT Experience from <br/>Computers to different Auxilliaries.</p>
   
                </div>
                    <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3> Philgreps Certification</h3>
                        <p>Centralized Electronic portal that <br/> Serves Source of Information on<br/> Government procurement.</p>
                        
                </div>
                <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Brand Partnership</h3>
                        <p>Well-known CCTV brands like<br/> Hikvision, Duhua and UIV are <br/>partners with us.</p>
                </div>
                <div className="col-md-3">
                        <img src="/images/Check.jpg" className="check icon" alt="Check"></img>
                        <h3>Operated Nationwide</h3>
                        <p>Througout the years, this company<br/>have operated from Luzon,<br/> Visayas and Mindanao.</p>
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