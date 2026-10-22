import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";

import Navbar from "../Components/navbar";
import GoogleLoginButton from "../Components/GoogleLoginButton";
import "../../css/login.css";

export default function Login() {
    const { props } = usePage();
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [resendingVerification, setResendingVerification] = useState(false);
    const [verificationActionError, setVerificationActionError] = useState("");

    const { data, setData, post, processing } = useForm({
        email: "",
        password: "",
        remember: false,
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

    const resendVerification = () => {
        const email = String(props.flash?.verificationEmail || data.email || "").trim();

        if (!email) {
            setVerificationActionError("Enter the email address used to create your account.");
            return;
        }

        setVerificationActionError("");
        setResendingVerification(true);

        router.post(
            "/email/verification-notification",
            { email },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setVerificationActionError(
                        errors.email || "We could not resend the verification email. Please try again shortly."
                    );
                },
                onFinish: () => setResendingVerification(false),
            }
        );
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
                {props.flash?.verificationRequired && (
                    <div className="alert alert-warning mx-auto mb-4" role="alert" style={{ maxWidth: "820px" }}>
                        <div className="fw-bold mb-1">
                            <i className="bi bi-envelope-exclamation me-2"></i>
                            Email verification required
                        </div>
                        <p className="mb-2">
                            Your password is correct, but this account has not verified its email address yet.
                            {props.flash.verificationEmail ? (
                                <> We are checking <strong>{props.flash.verificationEmail}</strong>. Please check your inbox and spam folder for the verification link before logging in.</>
                            ) : (
                                <> Please check the inbox and spam folder for the verification link before logging in.</>
                            )}
                        </p>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-dark fw-semibold"
                            onClick={resendVerification}
                            disabled={resendingVerification}
                        >
                            {resendingVerification ? "Sending..." : "Resend verification email"}
                        </button>
                        {props.flash?.message && (
                            <div className="small mt-2" role="status">{props.flash.message}</div>
                        )}
                        {verificationActionError && (
                            <div className="small text-danger mt-2" role="alert">{verificationActionError}</div>
                        )}
                    </div>
                )}
                {!props.flash?.verificationRequired && props.flash?.message && (
                    <div className="alert alert-info mx-auto mb-4" role="status" style={{ maxWidth: "820px" }}>
                        {props.flash.message}
                    </div>
                )}
                {props.flash?.status && (
                    <div
                        className="alert alert-info mx-auto mb-4"
                        role="status"
                        style={{ maxWidth: "820px" }}
                    >
                        {props.flash.status}
                    </div>
                )}

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

                            {/* REMEMBER ME / FORGOT PASSWORD */}
                            <div className="login-options-row">
                                <label htmlFor="login-remember" className="login-remember-control">
                                    <input
                                        id="login-remember"
                                        name="remember"
                                        type="checkbox"
                                        className="login-remember-checkbox"
                                        checked={Boolean(data.remember)}
                                        onChange={(event) => setData("remember", event.target.checked)}
                                    />
                                    <span className="login-remember-label">Remember Me</span>
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="login-forgot-password"
                                >
                                    Forgot Password?
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
                                <GoogleLoginButton />

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