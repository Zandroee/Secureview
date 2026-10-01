import { Link } from '@inertiajs/react';
import { useState } from 'react';

import Navbar from '../Components/navbar';
import '../../css/login.css';


export default function Login(){
const [showPassword, setShowPassword] = useState(false);
    return(
        <>
            <Navbar/>

            <section id="login-page">

                <h1 className="login-title">
                    SECUREVIEW
                </h1>

                <div className="login-container">

                    <div className="login-image">

                        <img
                            src="/images/login-picture-secureview.jpg"
                            alt="CCTV"
                        />

                    </div>

                    <div className="login-form">

                        <h1>
                            LOG IN
                        </h1>

                        <label>
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="Email"
                        />

                        <label>
                            Password
                        </label>

                        <div className="password-container">
                            <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                            </button>
                        </div>

                        <Link href="#">
                            Forgot Password
                        </Link>

                        <div className="login-buttons">

                            <button>
                                Login
                            </button>

                            <Link href="/signup">
                                Create an Account
                            </Link>

                        </div>

                    </div>

                </div>

            </section>
        </>
    )
}