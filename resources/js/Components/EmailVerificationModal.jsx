import { router } from "@inertiajs/react";
import { useEffect, useState } from "react";

export default function EmailVerificationModal({ email, onClose }) {
    const [resending, setResending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [resent, setResent] = useState(false);
    const [message, setMessage] = useState("");
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((previous) => previous - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const resendVerification = () => {
        if (resending || cooldown > 0) return;

        setResending(true);
        setResent(false);
        setMessage("");

        router.post(
            "/email/verification-notification",
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setResent(true);
                    setCooldown(60);
                },

                onError: () => {
                    setMessage(
                        "Unable to send the verification email right now. Please try again."
                    );
                },

                onFinish: () => {
                    setResending(false);
                },
            }
        );
    };

    const checkVerification = () => {
        setChecking(true);
        setMessage("");

        router.reload({
            only: ["auth"],

            preserveState: true,
            preserveScroll: true,

            onSuccess: (page) => {
                const user = page.props.auth?.user;
                const verified = Boolean(user?.email_verified_at);

                if (verified) {
                    onClose();
                    return;
                }

                setMessage(
                    "Your email has not been verified yet. Please click the verification link in your email."
                );
            },

            onFinish: () => {
                setChecking(false);
            },
        });
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.78)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "540px",
                    backgroundColor: "#ffffff",
                    borderRadius: "18px",
                    padding: "32px 38px",
                    boxShadow: "0 15px 50px rgba(0, 0, 0, 0.25)",
                }}
            >
                <div className="d-flex justify-content-between align-items-center">
                    <h2
                        className="mb-0 fw-bold"
                        style={{
                            color: "#727272",
                            fontFamily: "Outfit, sans-serif",
                            fontSize: "28px",
                        }}
                    >
                        Email Verification
                    </h2>

                    <button
                        type="button"
                        className="btn btn-link text-primary text-decoration-none p-0"
                        onClick={onClose}
                        disabled={checking || resending}
                    >
                        Back
                    </button>
                </div>

                <div className="text-center mt-4">
                    <p
                        className="mb-2"
                        style={{
                            color: "#555",
                            fontSize: "17px",
                        }}
                    >
                        Check your email for the verification link.
                    </p>

                    <p
                        className="fw-semibold mb-4"
                        style={{
                            color: "#333",
                            wordBreak: "break-word",
                        }}
                    >
                        {email}
                    </p>

                    <button
                        type="button"
                        className="btn btn-link text-primary text-decoration-none"
                        onClick={resendVerification}
                        disabled={resending || cooldown > 0}
                    >
                        {resending
                            ? "Sending..."
                            : cooldown > 0
                              ? `Resend available in ${cooldown}s`
                              : "Resend Verification Email"}
                    </button>

                    {resent && (
                        <p className="text-success small mt-2 mb-0">
                            A new verification email has been sent.
                        </p>
                    )}

                    {message && (
                        <p className="text-danger small mt-3 mb-0">
                            {message}
                        </p>
                    )}

                    <button
                        type="button"
                        className="btn btn-primary fw-bold w-75 mt-4"
                        style={{
                            borderRadius: "15px",
                            padding: "13px",
                        }}
                        onClick={checkVerification}
                        disabled={checking || resending}
                    >
                        {checking
                            ? "CHECKING..."
                            : "I'VE VERIFIED MY EMAIL"}
                    </button>
                </div>
            </div>
        </div>
    );
}