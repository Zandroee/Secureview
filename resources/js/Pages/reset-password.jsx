import { Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import PasswordInput from "../Components/PasswordInput";
import PasswordStrength from "../Components/PasswordStrength";
import Navbar from "../Components/navbar";
import "../../css/signup.css";

export default function ResetPassword({ token, email = "" }) {
    const [touched, setTouched] = useState({
        password: false,
        password_confirmation: false,
    });

    const [submitAttempted, setSubmitAttempted] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: "",
        password_confirmation: "",
    });

    const passwordRules = {
        length: data.password.length >= 8,
        uppercase: /[A-Z]/.test(data.password),
        lowercase: /[a-z]/.test(data.password),
        number: /\d/.test(data.password),
        special: /[^A-Za-z0-9]/.test(data.password),
        noSpaces: !/\s/.test(data.password),
    };

    const getError = (field) => {
        if (errors[field]) {
            return errors[field];
        }

        if (!touched[field] && !submitAttempted) {
            return "";
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
            password: true,
            password_confirmation: true,
        });

        const passwordError = getError("password");
        const confirmationError = getError("password_confirmation");

        if (passwordError || confirmationError) {
            return;
        }

        post("/reset-password", {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Navbar />

            <section
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
                    style={{
                        maxWidth: "520px",
                        width: "100%",
                    }}
                >
                    <h2
                        className="text-center fw-semibold mb-4"
                        style={{
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        RESET PASSWORD
                    </h2>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-3">
                            <label
                                htmlFor="reset-email"
                                className="form-label fw-medium"
                            >
                                Email
                            </label>

                            <input
                                id="reset-email"
                                type="email"
                                className="form-control"
                                value={data.email}
                                readOnly
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="mb-3">
                            <label className="form-label fw-medium">
                                New Password
                            </label>

                            <PasswordInput
                                value={data.password}
                                onChange={(e) =>
                                    setData("password", e.target.value)
                                }
                                onBlur={() => markTouched("password")}
                                placeholder="New Password"
                                maxLength={128}
                                invalid={isInvalid("password")}
                            />

                            {getError("password") && (
                                <div className="text-danger small mt-1">
                                    {getError("password")}
                                </div>
                            )}
                        </div>

                        <PasswordStrength password={data.password} />

                        {/* CONFIRM PASSWORD */}
                        <div className="mb-4 mt-3">
                            <label className="form-label fw-medium">
                                Confirm Password
                            </label>

                            <PasswordInput
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        "password_confirmation",
                                        e.target.value
                                    )
                                }
                                onBlur={() =>
                                    markTouched("password_confirmation")
                                }
                                placeholder="Confirm Password"
                                maxLength={128}
                                invalid={isInvalid(
                                    "password_confirmation"
                                )}
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

                        <button
                            type="submit"
                            className="btn btn-primary fw-bold w-100 py-2"
                            disabled={processing}
                        >
                            {processing
                                ? "RESETTING..."
                                : "RESET PASSWORD"}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <Link
                            href="/login"
                            className="text-primary text-decoration-none small"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}