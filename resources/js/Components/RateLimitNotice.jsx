import { usePage } from "@inertiajs/react";

export default function RateLimitNotice({ className = "mb-3" }) {
    const { flash } = usePage().props;
    const message = flash?.rateLimitMessage;

    if (!message) {
        return null;
    }

    return (
        <div
            className={`alert alert-warning ${className}`}
            role="alert"
            aria-live="polite"
        >
            <div className="d-flex align-items-start gap-2">
                <i className="bi bi-hourglass-split mt-1" aria-hidden="true" />
                <div>
                    <div className="fw-semibold mb-1">Please wait a moment</div>
                    <p className="mb-0">{message}</p>
                </div>
            </div>
        </div>
    );
}
