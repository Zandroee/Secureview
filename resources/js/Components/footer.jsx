import { Link } from "@inertiajs/react";

export default function Footer() {
    return (
        <footer className="site-footer bg-primary text-white mt-5 pt-4 pb-4">
            <div className="container-fluid px-4 px-lg-5">
                <div className="row align-items-start g-4">
                    <div className="col-md-4 mb-md-0">
                        <Link href="/" className="netmax-footer-logo-wrap" aria-label="Netmax Trading home">
                            <img
                                src="/images/netmax-logo-dark.png"
                                alt="Netmax Trading"
                                className="netmax-footer-logo"
                                loading="lazy"
                            />
                        </Link>
                    </div>

                    <div className="col-md-3">
                        <h4 className="fw-bold mb-3">Quick Links</h4>
                        <Link href="/" className="d-block text-white text-decoration-none mb-2">HOME</Link>
                        <Link href="/products" className="d-block text-white text-decoration-none mb-2">BROWSE</Link>
                        <Link href="/about" className="d-block text-white text-decoration-none">ABOUT</Link>
                    </div>

                    <div className="col-md-5">
                        <h4 className="fw-bold mb-3">Contact Us</h4>
                        <p className="mb-2">PHONE NO: 0984-1234-856</p>
                        <p className="mb-2">EMAIL: netmaxtrading@hotmail.com</p>
                        <p className="mb-0">
                            FB:{" "}
                            <a
                                href="https://www.facebook.com/COMPUTERANDCCTV/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white fw-semibold text-decoration-underline"
                            >
                                Netmax Trading
                            </a>
                        </p>
                    </div>
                </div>

                <hr className="border-white border-2 opacity-100 mt-4" />

                <div className="text-center mt-4">
                    <p className="mb-0">© 2026 Netmax Trading. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
