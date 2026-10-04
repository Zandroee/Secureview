import { router } from "@inertiajs/react";
import { useEffect, useState } from "react";

export default function EmailVerificationModal({ email, onClose }) {
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((previous) => previous - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const resendVerification = () => {
        if (resending || cooldown > 0) {
            return;
        }

        setResending(true);
        setResent(false);

        router.post(
            "/email/verification-notification",
            {
                email,
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setResent(true);
                    setCooldown(60);
                },

                onFinish: () => {
                    setResending(false);
                },
            }
        );
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
                        disabled={resending}
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
                        A verification link has been sent to:
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

                    {resent && (
                        <div className="alert alert-success text-start">
                            A new verification email has been sent successfully.
                        </div>
                    )}

                    <button
                        type="button"
                        className="btn btn-link text-primary text-decoration-none"
                        onClick={resendVerification}
                        disabled={resending || cooldown > 0}
                    >
                        {resending
                            ? "SENDING..."
                            : cooldown > 0
                              ? `RESEND AVAILABLE IN ${cooldown}s`
                              : "RESEND VERIFICATION EMAIL"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary fw-bold w-75 mt-4"
                        style={{
                            borderRadius: "15px",
                            padding: "13px",
                        }}
                        onClick={onClose}
                        disabled={resending}
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
    );
}