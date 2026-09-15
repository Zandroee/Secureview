import { useState } from "react";

export default function PasswordInput({
    value,
    onChange,
    placeholder
}) {

    // controls the password visibility.
    const [showPassword, setShowPassword] = useState(false);


    return (
        <div className="password-container">

            <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />

            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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