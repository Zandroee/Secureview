import { useEffect, useState } from "react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import Navbar from "../Components/navbar";

export default function VerifyEmail({ email = "", resendCooldownSeconds = 0 }) {
    const { props } = usePage();
    const [cooldown, setCooldown] = useState(Number(resendCooldownSeconds) || 0);
    const [resending, setResending] = useState(false);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        email: email || "",
        code: "",
    });

    useEffect(() => {
        if (cooldown <= 0) return undefined;

        const timer = window.setInterval(() => {
            setCooldown((seconds) => Math.max(0, seconds - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [cooldown]);

    const submitCode = (event) => {
        event.preventDefault();
        clearErrors();

        const normalizedEmail = data.email.trim();
        if (!normalizedEmail) {
            setError("email", "Enter the email address used to create your account.");
            return;
        }

        if (!/^\d{6}$/.test(data.code)) {
            setError("code", "Enter the six-digit code from your email.");
            return;
        }

        post("/email/verify", {
            preserveScroll: true,
        });
    };

    const resendCode = (event) => {
        event.preventDefault();
        clearErrors();

        const normalizedEmail = data.email.trim();
        if (!normalizedEmail) {
            setError("email", "Enter the email address used to create your account.");
            return;
        }

        setResending(true);
        router.post(
            "/email/verification-code/resend",
            { email: normalizedEmail },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setCooldown(60),
                onFinish: () => setResending(false),
            }
        );
    };

    return (
        <>
            <Navbar />
            <main
                className="container-fluid px-3 py-5"
                style={{ minHeight: "calc(100vh - 75px)" }}
            >
                <div className="mx-auto" style={{ maxWidth: "480px" }}>
                    <div className="border rounded-4 p-4 p-md-5 bg-body">
                        <div className="text-center mb-4">
                            <div
                                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                style={{
                                    width: 64,
                                    height: 64,
                                    background: "rgba(13, 110, 253, 0.1)",
                                    color: "#0d6efd",
                                }}
                                aria-hidden="true"
                            >
                                <i className="bi bi-envelope-check fs-2" />
                            </div>
                            <h1 className="h3 fw-bold mb-2">Verify your email</h1>
                            <p className="text-body-secondary mb-0">
                                Enter the six-digit code we emailed you to activate your SecureView account.
                            </p>
                        </div>

                        {props.flash?.status && (
                            <div className="alert alert-info" role="status">
                                {props.flash.status}
                            </div>
                        )}
                        {props.flash?.message && (
                            <div className="alert alert-info" role="status">
                                {props.flash.message}
                            </div>
                        )}

                        <form onSubmit={submitCode} noValidate>
                            <div className="mb-3">
                                <label htmlFor="verification-email" className="form-label fw-semibold">
                                    Email address
                                </label>
                                <input
                                    id="verification-email"
                                    type="email"
                                    autoComplete="email"
                                    maxLength={255}
                                    className={`form-control form-control-lg ${errors.email ? "is-invalid" : ""}`}
                                    placeholder="you@example.com"
                                    value={data.email}
                                    onChange={(event) => {
                                        setData("email", event.target.value);
                                        clearErrors("email");
                                    }}
                                    required
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="verification-code" className="form-label fw-semibold">
                                    6-digit verification code
                                </label>
                                <input
                                    id="verification-code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    className={`form-control form-control-lg text-center ${errors.code ? "is-invalid" : ""}`}
                                    style={{ letterSpacing: "0.45em", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
                                    placeholder="000000"
                                    value={data.code}
                                    onChange={(event) => {
                                        setData("code", event.target.value.replace(/\D/g, "").slice(0, 6));
                                        clearErrors("code");
                                    }}
                                    aria-describedby="verification-code-help"
                                    required
                                />
                                <div id="verification-code-help" className="form-text">
                                    The code expires after 10 minutes. Check your spam folder if you cannot find the email.
                                </div>
                                {errors.code && <div className="text-danger small mt-1" role="alert">{errors.code}</div>}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg fw-semibold w-100 mt-2"
                                disabled={processing || data.code.length !== 6 || !data.email.trim()}
                            >
                                {processing ? "VERIFYING..." : "VERIFY EMAIL"}
                            </button>
                        </form>

                        <div className="text-center mt-4">
                            <p className="text-body-secondary small mb-2">
                                Haven’t received a code yet?
                            </p>
                            <button
                                type="button"
                                className="btn btn-link text-decoration-none fw-semibold"
                                onClick={resendCode}
                                disabled={resending || cooldown > 0 || !data.email.trim()}
                            >
                                {resending
                                    ? "SENDING CODE..."
                                    : cooldown > 0
                                      ? `RESEND AVAILABLE IN ${cooldown}s`
                                      : "RESEND VERIFICATION CODE"}
                            </button>
                            <div className="text-body-secondary small mt-2">
                                For security, you can request a new code once every 60 seconds.
                            </div>
                        </div>

                        <div className="text-center mt-4 pt-3 border-top">
                            <Link href="/login" className="text-decoration-none small">
                                Back to login
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
