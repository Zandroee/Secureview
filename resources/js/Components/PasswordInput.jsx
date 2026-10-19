import { useState } from "react";

export default function PasswordInput({ value, onChange, onBlur, placeholder, maxLength, invalid = false }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="position-relative">
            <input
                type={showPassword ? "text" : "password"}
                className={`form-control pe-5 ${invalid ? "is-invalid" : ""}`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                maxLength={maxLength}
            />

            <button
                type="button"
                className="btn position-absolute top-50 end-0 translate-middle-y text-secondary border-0"
                onClick={() => setShowPassword(!showPassword)}
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
    );
}