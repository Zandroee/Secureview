import { Link } from '@inertiajs/react';

export default function Navbar() {
    return (
        <nav class="navbar navbar-expand-lg bg-body-tertiary shadow p-3 bg-body-tertiary rounded">
            <div class="container-fluid">

                {/* LOGO */}

                <a className="navbar-brand fw-bold fs-4" href="/" style={{ fontFamily: "Outfit, sans-serif" }}>
                    SECUREVIEW
                </a>

                {/* OFFCANVAS TOGGLER */}

                <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvas">
                    <span className="navbar-toggler-icon"></span>
                </button>
                
                {/* OFFCANVAS MENU */}

                <div className="offcanvas offcanvas-end " tabIndex="-1" id="navbarOffcanvas">
                    <div className="offcanvas-header">
                        <h5 className="offcanvas-title">MENU</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
                    </div>

                    {/* NAV LINKS */}

                    <div className="offcanvas-body">
                        <ul className="navbar-nav ms-auto column-gap-lg-5" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <li className="nav-item">
                                <a className="nav-link" href="/">HOME</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/products">PRODUCTS</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">PACKAGES</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">ABOUT</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* LINE GAP */}

                <div className="vr mx-5"></div>

                {/* LOGIN and SIGNUP BUTTONS */}

                <div className="d-flex gap-3">
                    <a className="btn btn-primary fw-b" href="#" role="button" style={{fontFamily: "Outfit, sans-serif", "--bs-btn-padding-x": "25px"}}>
                        LOGIN
                    </a>
                    <a className="btn btn-outline-primary fw-b"href="#" role="button" style={{fontFamily: "Outfit, sans-serif", "--bs-btn-padding-x": "25px"}}>
                        SIGN UP
                    </a>
                </div>
            </div>
        </nav>
    );
}