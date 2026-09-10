import { Link } from '@inertiajs/react';
import '../../css/navbar.css';

export default function Navbar() {
    return (
        <section id="header">
            <Link href="/" className="logo">
                SECUREVIEW
            </Link>

            <div>
                <ul id="navbar">
                    <li>
                        <Link href="/">HOME</Link>
                    </li>

                    <li>
                        <Link href="/products">PRODUCTS</Link>
                    </li>

                    <li>
                        <Link href="/packages">PACKAGES</Link>
                    </li>

                    <li>
                        <Link href="/about">ABOUT</Link>
                    </li>

                    <li>
                        <Link href="/login" className="login">
                            LOG IN
                        </Link>
                    </li>

                    <li>
                        <Link href="/signup" className="signup">
                            SIGN UP
                        </Link>
                    </li>
                </ul>
            </div>
        </section>
    );
}