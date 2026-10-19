import { Link, useForm } from "@inertiajs/react";
import { useState } from "react";

import Navbar from "../Components/navbar";
import "../../css/login.css";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const { data, setData, post, processing } = useForm({
        email: "",
        password: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        setEmailError("");
        setPasswordError("");

        const email = data.email.trim();

        if (!email) {
            setEmailError("Email is required.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Enter a valid email address.");
            return;
        }

        if (!data.password) {
            setPasswordError("Password is required.");
            return;
        }

        post("/login", {
            preserveScroll: true,

            onError: (serverErrors) => {
                if (serverErrors.email) {
                    setEmailError(serverErrors.email);
                    return;
                }

                if (serverErrors.password) {
                    setPasswordError(serverErrors.password);
                    return;
                }

                setEmailError("");
                setPasswordError(
                    "Unable to log in. Please check your information."
                );
            },

            onSuccess: () => {
                setEmailError("");
                setPasswordError("");
            },
        });
    };

    const emailHasError = Boolean(emailError);
    const passwordHasError = Boolean(passwordError);

    return (
        <>
            <Navbar />

            <section
                id="login-page"
                className="container-fluid px-3 px-md-4 py-5"
                style={{ minHeight: "calc(100vh - 75px)" }}
            >
                <h1
                    className="text-center fw-bold mb-5"
                    style={{
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "clamp(2rem, 4vw, 3rem)",
                    }}
                >
                    SECUREVIEW
                </h1>

                <div
                    className="row g-0 mx-auto border rounded-3 overflow-hidden"
                    style={{
                        maxWidth: "820px",
                        width: "100%",
                    }}
                >
                    <div className="col-12 col-md-6">
                        <img
                            src="/images/login-picture-secureview.jpg"
                            alt="CCTV"
                            className="w-100 h-100"
                            style={{
                                minHeight: "240px",
                                height: "min(360px, 50vw)",
                                objectFit: "cover",
                                display: "block",
                            }}
                        />
                    </div>

                    <div className="col-12 col-md-6 d-flex align-items-center">
                        <form
                            className="w-100 p-4 p-md-5"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <h1
                                className="text-center fw-semibold mb-5"
                                style={{
                                    fontFamily: "Outfit, sans-serif",
                                    fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                                }}
                            >
                                LOG IN
                            </h1>

                            {/* EMAIL */}
                            <div className="mb-4">
                                <label
                                    htmlFor="login-email"
                                    className="form-label fw-medium"
                                >
                                    Email
                                </label>

                                <input
                                    id="login-email"
                                    type="email"
                                    maxLength={255}
                                    className={`form-control ${emailHasError ? "is-invalid" : ""}`}
                                    placeholder="Email"
                                    value={data.email}
                                    onChange={(e) => {
                                        setData("email", e.target.value);
                                        setEmailError("");
                                    }}
                                />

                                {emailHasError && (
                                    <div className="text-danger small mt-1">
                                        {emailError && (
                                            <div className="text-danger small mt-1">
                                                {emailError}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="mb-3">
                                <label
                                    htmlFor="login-password"
                                    className="form-label fw-medium"
                                >
                                    Password
                                </label>

                                <div className="position-relative">
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        className={`form-control pe-5 ${passwordHasError ? "is-invalid" : ""}`}
                                        placeholder="Password"
                                        value={data.password}
                                        onChange={(e) => {
                                            setData("password", e.target.value);
                                            setPasswordError("");
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="btn position-absolute top-50 end-0 translate-middle-y text-secondary border-0"
                                        aria-label="Toggle password visibility"
                                    >
                                        <i
                                            className={
                                                showPassword
                                                    ? "bi bi-eye-slash"
                                                    : "bi bi-eye"
                                            }
                                        ></i>
                                    </button>
                                </div>

                                {passwordError && (
                                    <div className="text-danger small mt-1">
                                        {passwordError}
                                    </div>
                                )}
                            </div>

                            {/* FORGOT PASSWORD */}
                            <div className="mb-4">
                                <Link
                                    href="/forgot-password"
                                    className="text-primary text-decoration-none small"
                                >
                                    Forgot Password
                                </Link>
                            </div>

                            {/* BUTTONS */}
                            <div className="d-flex flex-column flex-sm-row gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary fw-bold flex-fill py-2"
                                    disabled={processing}
                                >
                                    {processing ? "LOGGING IN..." : "Login"}
                                </button>

                                <Link
                                    href="/signup"
                                    className="btn btn-outline-primary fw-bold flex-fill py-2"
                                >
                                    Create an Account
                                </Link>
                            </div>

                            {/* SOCIAL LOGIN */}
                            <div className="text-center my-4">
                                <span className="text-muted small">
                                    OR
                                </span>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                <a
                                    href="/auth/google"
                                    className="btn btn-outline-dark fw-semibold py-2"
                                >
                                    <i className="bi bi-google me-2"></i>
                                    Continue with Google
                                </a>

                                <a
                                    href="/auth/facebook"
                                    className="btn btn-primary fw-semibold py-2"
                                >
                                    <i className="bi bi-facebook me-2"></i>
                                    Continue with Facebook
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}