import '../../css/landing.css';
import Navbar from '../Components/navbar';
import Footer from '../Components/footer';
import { useState } from "react";

export default function landing() {
    const [currentPage, setCurrentPage] = useState(1);

    const cardsPerPage = 4;

    const cctvPackages = [
    {
        title: "CCTV Package 1",
        text: "Complete CCTV package for home security.",
        image: "/images/cctv-cameras.jpg",
        tag: "Popular"
    },
    {
        title: "CCTV Package 2",
        text: "Reliable CCTV package for small businesses.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 3",
        text: "High-quality cameras for indoor and outdoor use.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 4",
        text: "Affordable security package.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 5",
        text: "Advanced CCTV package with clear video.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 6",
        text: "Security cameras suitable for larger areas.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 7",
        text: "Professional CCTV package.",
        image: "/images/cctv-cameras.jpg"
    },
    {
        title: "CCTV Package 8",
        text: "Reliable surveillance for your property.",
        image: "/images/cctv-cameras.jpg"
    }
];

    const totalPages = Math.ceil(cctvPackages.length / cardsPerPage);

    const indexOfFirstCard = (currentPage - 1) * cardsPerPage;
    const currentCards = cctvPackages.slice(indexOfFirstCard, indexOfFirstCard + cardsPerPage);
    return (
        <>
            <Navbar />

            {/* HEADER SECTION */}
            <header className="bg-primary d-flex align-items-center text-white">
                <div className="container-fluid" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <div className="row align-items-center gap-5">

                        <div className="col-md-6 text-center">
                            <img src="/images/cctv-cameras.jpg" className="img-fluid" style={{ width: "100%", height: "600px", objectFit: "cover", objectPosition: "center" }} alt="camera_img"></img>
                        </div>

                        <div className="col-md-5 text-center text-md-center d-flex flex-column gap-5" style={{ padding: "50px" }}>

                            <h1 className="display-1 fw-bold" style={{fontFamily: "Outfit, sans-serif"}}>
                                Secure your home or your business
                            </h1>

                            <p className="display-6" style={{fontFamily: "Outfit, sans-serif"}}>
                                Secure them with our optimal CCTV packages offers just for you!
                            </p>
                            
                            <div className="d-flex justify-content-center justify-content-md-center mx-auto gap-3" >
                                <a className="btn btn-outline-primary bg-white fw-bold fs-5"href="#" role="button" style={{fontFamily: "Outfit, sans-serif", "--bs-btn-padding-x": "50px", "--bs-btn-padding-y": "10px"}}>
                                    VIEW PACKAGES
                                </a>
                                <a className="btn btn-outline-primary bg-white fw-bold fs-5"href="#" role="button" style={{fontFamily: "Outfit, sans-serif", "--bs-btn-padding-x": "50px", "--bs-btn-padding-y": "10px"}}>
                                    BROWSE CAMERAS
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2ND SECTION */}
            <section className="text-dark mt-5">

                <h2 className="display-6 fw-bold text-center" style={{fontFamily: "Outfit, sans-serif"}}>
                    Featured CCTV Packages
                </h2>

                <div className="fs-5 text-primary text-end pe-5">
                    <a className="nav-link" style={{fontFamily: "Outfit, sans-serif"}} href="#">
                        VIEW ALL
                    </a>
                </div>

                <div className="container-fluid mt-4 px-3 px-md-4 px-lg-5">
                    <div className="d-flex align-items-center">

                        {/* LEFT ARROW */}
                        {totalPages > 1 && (
                            <button
                                className="btn btn-primary me-2 me-md-3 flex-shrink-0"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                ←
                            </button>
                        )}

                        {/* CARDS */}
                        <div className="row g-3 g-md-4 flex-grow-1">

                            {currentCards.map((card, index) => (
                                <div
                                    className="col-12 col-sm-6 col-lg-3"
                                    key={index}
                                >
                                    <div className="card h-100">
                                        {/* IMAGE + TAG */}
                                        <div className="position-relative">
                                            <img
                                                src={card.image}
                                                className="card-img-top"
                                                alt={card.title}
                                            />

                                            <span className="position-absolute top-0 end-0 badge bg-primary m-2">
                                                {card.tag}
                                            </span>
                                        </div>

                                        <div className="card-body">
                                            <h5 className="card-title">
                                                {card.title}
                                            </h5>

                                            <p className="card-text">
                                                {card.text}
                                            </p>

                                            <a href="#" className="btn btn-primary">
                                                Go somewhere
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        </div>

                        {/* RIGHT ARROW */}
                        {totalPages > 1 && (
                            <button
                                className="btn btn-primary ms-2 ms-md-3 flex-shrink-0"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                →
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* 3RD SECTION */}
            <section className="text-dark mt-5">

                <h2 className="display-6 fw-bold text-center" style={{fontFamily: "Outfit, sans-serif"}}>
                    Featured Cameras
                </h2>

                <div className="fs-5 text-primary text-end pe-5">
                    <a className="nav-link" style={{fontFamily: "Outfit, sans-serif"}} href="#">
                        VIEW ALL
                    </a>
                </div>

                <div className="container-fluid mt-4 px-3 px-md-4 px-lg-5">
                    <div className="d-flex align-items-center">

                        {/* LEFT ARROW */}
                        {totalPages > 1 && (
                            <button
                                className="btn btn-primary me-2 me-md-3 flex-shrink-0"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                ←
                            </button>
                        )}

                        {/* CARDS */}
                        <div className="row g-3 g-md-4 flex-grow-1">

                            {currentCards.map((card, index) => (
                                <div
                                    className="col-12 col-sm-6 col-lg-3"
                                    key={index}
                                >
                                    <div className="card h-100">
                                        {/* IMAGE + TAG */}
                                        <div className="position-relative">
                                            <img
                                                src={card.image}
                                                className="card-img-top"
                                                alt={card.title}
                                            />

                                            <span className="position-absolute top-0 end-0 badge bg-primary m-2">
                                                {card.tag}
                                            </span>
                                        </div>

                                        <div className="card-body">
                                            <h5 className="card-title">
                                                {card.title}
                                            </h5>

                                            <p className="card-text">
                                                {card.text}
                                            </p>

                                            <a href="#" className="btn btn-primary">
                                                Go somewhere
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        </div>

                        {/* RIGHT ARROW */}
                        {totalPages > 1 && (
                            <button
                                className="btn btn-primary ms-2 ms-md-3 flex-shrink-0"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                →
                            </button>
                        )}
                    </div>
                </div>
            </section>

            
            <Footer />
        </>
    );
}