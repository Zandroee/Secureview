import { useEffect, useState } from "react";
import { useForm, Link } from "@inertiajs/react";

import Navbar from "../Components/navbar";
import PasswordInput from "../Components/PasswordInput";
import PasswordStrength from "../Components/PasswordStrength";
import EmailVerificationModal from "../Components/EmailVerificationModal";
import TermsAndConditionsModal from "../Components/TermsAndConditionsModal";

import "../../css/signup.css";

export default function Signup({ verificationSent = false, verificationEmail = "" }) {
    const [showVerification, setShowVerification] = useState(verificationSent);
    const [showTerms, setShowTerms] = useState(false);
    const [termsRead, setTermsRead] = useState(false);

    useEffect(() => {
        if (verificationSent) {
            setShowVerification(true);
        }
    }, [verificationSent]);

    const { data, setData, post, processing, errors, reset } = useForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        password: "",
        password_confirmation: "",
        terms: false,
    });

    const [touched, setTouched] = useState({
        firstName: false,
        lastName: false,
        phone: false,
        email: false,
        password: false,
        password_confirmation: false,
        terms: false,
    });

    const [submitAttempted, setSubmitAttempted] = useState(false);

    const passwordRules = {
        length: data.password.length >= 8,
        uppercase: /[A-Z]/.test(data.password),
        lowercase: /[a-z]/.test(data.password),
        number: /\d/.test(data.password),
        special: /[^A-Za-z0-9]/.test(data.password),
        noSpaces: !/\s/.test(data.password),
    };

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

    const getError = (field) => {
        if (errors[field]) {
            return errors[field];
        }

        if (!touched[field] && !submitAttempted) {
            return "";
        }

        if (field === "firstName" && !data.firstName.trim()) {
            return "First name is required.";
        }

        if (field === "lastName" && !data.lastName.trim()) {
            return "Last name is required.";
        }

        if (field === "phone") {
            if (!data.phone) {
                return "Phone number is required.";
            }

            if (!/^09\d{9}$/.test(data.phone)) {
                return "Enter a valid 11-digit Philippine mobile number.";
            }
        }

        if (field === "email") {
            if (!data.email.trim()) {
                return "Email is required.";
            }

            if (!isEmailValid) {
                return "Enter a valid email address.";
            }
        }

        if (field === "password") {
            if (!data.password) {
                return "Password is required.";
            }

            if (
                !passwordRules.length ||
                !passwordRules.uppercase ||
                !passwordRules.lowercase ||
                !passwordRules.number ||
                !passwordRules.special ||
                !passwordRules.noSpaces
            ) {
                return "Password does not meet all requirements.";
            }
        }

        if (field === "password_confirmation") {
            if (!data.password_confirmation) {
                return "Please confirm your password.";
            }

            if (data.password !== data.password_confirmation) {
                return "Passwords do not match.";
            }
        }

        if (field === "terms" && !data.terms) {
            return termsRead
                ? "You must accept the Terms and Conditions."
                : "Please read and accept the Terms and Conditions.";
        }

        return "";
    };

    const isInvalid = (field) => Boolean(getError(field));

    const markTouched = (field) => {
        setTouched((previous) => ({
            ...previous,
            [field]: true,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setSubmitAttempted(true);

        setTouched({
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            password: true,
            password_confirmation: true,
            terms: true,
        });

        if (!data.terms) {
            setShowTerms(true);
            return;
        }

        post("/register", {
            preserveState: true,
            preserveScroll: true,

            onSuccess: () => {
                setShowVerification(true);
            },

            onError: (serverErrors) => {
                const emailExists =
                    serverErrors.email &&
                    serverErrors.email.toLowerCase().includes("already");

                const phoneExists =
                    serverErrors.phone &&
                    serverErrors.phone.toLowerCase().includes("already");

                if (emailExists && phoneExists) {
                    alert(
                        "An account already exists using this email address and phone number."
                    );
                } else if (emailExists) {
                    alert(
                        "An account already exists using this email address."
                    );
                } else if (phoneExists) {
                    alert(
                        "An account already exists using this phone number."
                    );
                }
            },
        });
    };

    return (
        <>
            <Navbar />

            <section
                id="signup-page"
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
                    className="border rounded-3 mx-auto p-4 p-md-5"
                    style={{ maxWidth: "600px", width: "100%" }}
                >
                    <h2
                        className="text-center fw-semibold mb-5"
                        style={{
                            fontFamily: "Outfit, sans-serif",
                            fontSize: "clamp(1.5rem, 3vw, 2rem)",
                        }}
                    >
                        CREATE AN ACCOUNT
                    </h2>

                    <form onSubmit={handleSubmit} noValidate>

                        {/* FIRST NAME */}
                        <div className="mb-3">
                            <label htmlFor="first-name" className="form-label">
                                First Name
                            </label>

                            <input
                                id="first-name"
                                type="text"
                                maxLength={50}
                                className={`form-control ${isInvalid("firstName") ? "is-invalid" : ""}`}
                                placeholder="First Name"
                                value={data.firstName}
                                onChange={(e) => setData("firstName", e.target.value)}
                                onBlur={() => markTouched("firstName")}
                                aria-invalid={isInvalid("firstName")}
                            />

                            {getError("firstName") && (
                                <div className="text-danger small mt-1">
                                    {getError("firstName")}
                                </div>
                            )}
                        </div>

                        {/* LAST NAME */}
                        <div className="mb-3">
                            <label htmlFor="last-name" className="form-label">
                                Last Name
                            </label>

                            <input
                                id="last-name"
                                type="text"
                                maxLength={50}
                                className={`form-control ${isInvalid("lastName") ? "is-invalid" : ""}`}
                                placeholder="Last Name"
                                value={data.lastName}
                                onChange={(e) => setData("lastName", e.target.value)}
                                onBlur={() => markTouched("lastName")}
                                aria-invalid={isInvalid("lastName")}
                            />

                            {getError("lastName") && (
                                <div className="text-danger small mt-1">
                                    {getError("lastName")}
                                </div>
                            )}
                        </div>

                        {/* PHONE */}
                        <div className="mb-3">
                            <label htmlFor="phone" className="form-label">
                                Phone no.
                            </label>

                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={11}
                                className={`form-control ${isInvalid("phone") ? "is-invalid" : ""}`}
                                placeholder="09*********"
                                value={data.phone}
                                onChange={(e) =>
                                    setData(
                                        "phone",
                                        e.target.value.replace(/\D/g, "").slice(0, 11)
                                    )
                                }
                                onBlur={() => markTouched("phone")}
                                aria-invalid={isInvalid("phone")}
                            />

                            {getError("phone") && (
                                <div className="text-danger small mt-1">
                                    {getError("phone")}
                                </div>
                            )}

                        </div>

                        {/* EMAIL */}
                        <div className="mb-3">
                            <label htmlFor="signup-email" className="form-label">
                                Email
                            </label>

                            <input
                                id="signup-email"
                                type="email"
                                maxLength={255}
                                className={`form-control ${isInvalid("email") ? "is-invalid" : ""}`}
                                placeholder="Email"
                                value={data.email}
                                onChange={(e) => setData("email", e.target.value)}
                                onBlur={() => markTouched("email")}
                                aria-invalid={isInvalid("email")}
                            />

                            {getError("email") && (
                                <div className="text-danger small mt-1">
                                    {getError("email")}
                                </div>
                            )}

                        </div>

                        {/* PASSWORD */}
                        <div className="mb-3">
                            <label className="form-label">
                                Password
                            </label>

                            <div className={isInvalid("password") ? "is-invalid" : ""}>
                                <PasswordInput
                                    value={data.password}
                                    onChange={(e) => setData("password", e.target.value)}
                                    onBlur={() => markTouched("password")}
                                    placeholder="Password"
                                    maxLength={128}
                                    invalid={isInvalid("password")}
                                />
                            </div>

                            {errors.password && (
                                <div className="text-danger small mt-1">
                                    {errors.password}
                                </div>
                            )}

                            {!errors.password && getError("password") && (
                                <div className="text-danger small mt-1">
                                    {getError("password")}
                                </div>
                            )}
                        </div>

                        <PasswordStrength password={data.password} />

                        {/* CONFIRM PASSWORD */}
                        <div className="mb-2 mt-3">
                            <label className="form-label">
                                Confirm Password
                            </label>

                            <PasswordInput
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData("password_confirmation", e.target.value)
                                }
                                onBlur={() => markTouched("password_confirmation")}
                                placeholder="Confirm Password"
                                invalid={isInvalid("password_confirmation")}
                            />

                            {getError("password_confirmation") && (
                                <div className="text-danger small mt-1">
                                    {getError("password_confirmation")}
                                </div>
                            )}

                            {data.password_confirmation &&
                                data.password === data.password_confirmation &&
                                !getError("password_confirmation") && (
                                    <div className="text-success small mt-1">
                                        Passwords match.
                                    </div>
                                )}
                        </div>

                        {/* TERMS */}
                        <div className="border rounded-3 p-3 mt-3 mb-3 bg-light-subtle">
                            <div className="d-flex align-items-start gap-2">
                                <input
                                    id="terms"
                                    className={`form-check-input mt-1 ${isInvalid("terms") ? "is-invalid" : ""}`}
                                    type="checkbox"
                                    checked={data.terms}
                                    disabled={!termsRead}
                                    onChange={(e) => setData("terms", e.target.checked)}
                                    onBlur={() => markTouched("terms")}
                                    aria-invalid={isInvalid("terms")}
                                />

                                <div>
                                    <label className="form-check-label" htmlFor="terms">
                                        I agree to the Terms and Conditions
                                    </label>

                                    <div className="small mt-1">
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 text-decoration-none"
                                            onClick={() => setShowTerms(true)}
                                        >
                                            {termsRead ? "Review Terms and Conditions" : "Read Terms and Conditions first"}
                                        </button>
                                    </div>

                                    {!termsRead && (
                                        <div className="text-muted small mt-1">
                                            You must read the terms before the acceptance checkbox can be selected.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {getError("terms") && (
                                <div className="text-danger small mt-2">
                                    {getError("terms")}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary fw-bold w-100 py-2"
                            disabled={processing}
                        >
                            {processing ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                        </button>

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

                        <div className="text-center mt-3">
                            <span className="text-muted small">
                                Already have an account?
                            </span>

                            <Link
                                href="/login"
                                className="text-primary text-decoration-none small fw-semibold ms-1"
                            >
                                Log in
                            </Link>
                        </div>
                    </form>
                </div>
            </section>

            {showTerms && (
                <TermsAndConditionsModal
                    onClose={() => setShowTerms(false)}
                    onAccept={() => {
                        setTermsRead(true);
                        setData("terms", true);
                        setShowTerms(false);
                    }}
                />
            )}

            {showVerification && (
                <EmailVerificationModal
                    email={verificationEmail || data.email}
                    onClose={() => setShowVerification(false)}
                />
            )}
        </>
    );
}