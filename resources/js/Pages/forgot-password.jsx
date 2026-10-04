import { Link, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import Navbar from "../Components/navbar";
import "../../css/login.css";

export default function ForgotPassword({ status = "" }) {
    const [emailSent, setEmailSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const { data, setData, post, processing, errors } = useForm({
        email: "",
    });

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((previous) => previous - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (cooldown > 0) {
            return;
        }

        setEmailSent(false);

        post("/forgot-password", {
            preserveScroll: true,

            onSuccess: () => {
                setEmailSent(true);
                setCooldown(60);
            },
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
                        className="text-center fw-semibold mb-3"
                        style={{
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        FORGOT PASSWORD
                    </h2>

                    <p className="text-center text-muted mb-4">
                        Enter your email address and we'll send you a password
                        reset link.
                    </p>

                    {emailSent && (
                        <div className="alert alert-success">
                            Password reset link sent successfully. Please check your email inbox.
                        </div>
                    )}

                    {errors.email && (
                        <div className="text-danger small mb-3">
                            {errors.email}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label
                                htmlFor="forgot-email"
                                className="form-label fw-medium"
                            >
                                Email
                            </label>

                            <input
                                id="forgot-email"
                                type="email"
                                maxLength={255}
                                className={`form-control ${
                                    errors.email ? "is-invalid" : ""
                                }`}
                                placeholder="Email"
                                value={data.email}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary fw-bold w-100 py-2"
                            disabled={processing || cooldown > 0}
                        >
                            {processing
                                ? "SENDING..."
                                : cooldown > 0
                                ? `RESEND AVAILABLE IN ${cooldown}s`
                                : "SEND RESET LINK"}
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