export default function PasswordStrength({password}){


    //password checks
        const passwordRules = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
            noSpaces: !/\s/.test(password),
        };

    //calculation, strength of password.
    const strength = Object.values(passwordRules).filter(Boolean).length;

    return (
        <div className="password-requirements">
            <div className="password-strength">
                <p>Password Strength</p>

                <div className="strength-bar">
                    <span
                        className={
                            password.length === 0 
                            ? "empty"
                            : strength === 6
                            ? "strong"
                            : strength >= 3
                            ? "medium"
                            : "weak"
                        }
                    ></span>
                </div>
            </div>

            <ul>
                <li className={passwordRules.length ? "valid" : "invalid"}>
                    Must have at least 8 characters
                </li>

                <li className={passwordRules.uppercase && passwordRules.lowercase ? "valid" : "invalid"}>
                    Must have at least 1 uppercase and 1 lowercase character
                </li>

                <li className={passwordRules.noSpaces ? "valid": "invalid"}>
                    Must not contain white spaces
                </li>

                <li className={passwordRules.number ? "valid" : "invalid"}>
                    Must contain numbers
                </li>

                <li className={passwordRules.special ? "valid" : "invalid"}>
                    Must contain special characters
                </li>
            </ul>
        </div>
    );
}