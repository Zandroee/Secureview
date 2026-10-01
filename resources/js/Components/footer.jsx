import { Link } from '@inertiajs/react';

export default function Footer() {
    return (
        <footer className="bg-primary text-white mt-5 pt-4 pb-4">
            <div className="container-fluid px-5">

                <div className="row align-items-start">

                    {/* LOGO */}
                    <div className="col-md-4 mb-4 mb-md-0">
                        <h2 className="fw-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
                            SECUREVIEW
                        </h2>
                    </div>

                    {/* QUICK LINKS */}
                    <div className="col-md-3 mb-4 mb-md-0">
                        <h4 className="fw-bold mb-3">
                            Quick Links
                        </h4>

                        <a href="#" className="d-block text-white text-decoration-none mb-2">
                            HOME
                        </a>
                        <a href="#" className="d-block text-white text-decoration-none mb-2">
                            BROWSE
                        </a>
                        <a href="#" className="d-block text-white text-decoration-none">
                            ABOUT
                        </a>
                    </div>

                    {/* CONTACT */}
                    <div className="col-md-5">
                        <h4 className="fw-bold mb-3">
                            Contact Us
                        </h4>

                        <p className="mb-2">PHONE NO: 0984-1234-856</p>
                        <p className="mb-2">EMAIL: netmaxtrading@hotmail.com</p>
                        <p className="mb-0">FB: Netmax Trading</p>
                    </div>

                </div>

                {/* LINE */}
                <hr className="border-white border-2 opacity-100 mt-4" />

                {/* COPYRIGHT */}
                <div className="text-center mt-4">
                    <p className="mb-0">
                        © 2026 SecureView Portal. All rights reserved.
                    </p>
                </div>

            </div>
        </footer>
    );
}