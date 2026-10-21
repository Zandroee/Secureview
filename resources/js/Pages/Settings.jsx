import Navbar from "../Components/navbar";
import Footer from "../Components/footer";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { applyUserTheme } from "../theme";

const themeOptions = [
    {
        value: "light",
        label: "Light",
        description: "Bright, familiar appearance",
        icon: "bi-sun",
    },
    {
        value: "dark",
        label: "Dark",
        description: "A darker interface for low light",
        icon: "bi-moon-stars",
    },
    {
        value: "system",
        label: "System",
        description: "Follow your device preference",
        icon: "bi-laptop",
    },
];

function FieldError({ message }) {
    return message ? <div className="text-danger small mt-1" role="alert">{message}</div> : null;
}

export default function Settings({ settings = {} }) {
    const { props } = usePage();
    const [name, setName] = useState(settings.name ?? "");
    const [phone, setPhone] = useState(settings.phone ?? "");
    const [theme, setTheme] = useState(settings.preferred_theme ?? "system");
    const [notificationPopups, setNotificationPopups] = useState(
        settings.notification_popups_enabled !== false
    );
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [profileWorking, setProfileWorking] = useState(false);
    const [preferencesWorking, setPreferencesWorking] = useState(false);
    const [passwordWorking, setPasswordWorking] = useState(false);

    useEffect(() => {
        setName(settings.name ?? "");
        setPhone(settings.phone ?? "");
        setTheme(settings.preferred_theme ?? "system");
        setNotificationPopups(settings.notification_popups_enabled !== false);
        applyUserTheme(settings.preferred_theme ?? "system");
    }, [
        settings.name,
        settings.phone,
        settings.preferred_theme,
        settings.notification_popups_enabled,
    ]);

    const saveProfile = (event) => {
        event.preventDefault();
        setProfileWorking(true);

        router.patch("/settings/profile", { name, phone }, {
            preserveScroll: true,
            onFinish: () => setProfileWorking(false),
        });
    };

    const chooseTheme = (nextTheme) => {
        setTheme(nextTheme);
        // Preview the appearance immediately; the Save Preferences action below
        // persists it to the signed-in account.
        applyUserTheme(nextTheme);
    };

    const savePreferences = (event) => {
        event.preventDefault();
        setPreferencesWorking(true);

        router.patch("/settings/preferences", {
            preferred_theme: theme,
            notification_popups_enabled: notificationPopups,
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                applyUserTheme(page.props.auth?.user?.preferred_theme ?? theme);
            },
            onError: () => applyUserTheme(settings.preferred_theme ?? "system"),
            onFinish: () => setPreferencesWorking(false),
        });
    };

    const savePassword = (event) => {
        event.preventDefault();
        setPasswordWorking(true);

        router.patch("/settings/password", {
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            },
            onFinish: () => setPasswordWorking(false),
        });
    };

    const errors = props.errors ?? {};

    return (
        <div className="settings-page min-vh-100">
            <Navbar />

            <main
                style={{
                    backgroundColor: "#f5f6f8",
                    minHeight: "70vh",
                }}
            >
                <div className="container py-4 py-lg-5">
                    <div className="mb-4">
                        <div className="small text-primary fw-bold">SECUREVIEW ACCOUNT</div>
                        <h1 className="fw-bold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                            SETTINGS
                        </h1>
                        <p className="text-muted mb-0">
                            Manage your account information, appearance, notifications, and security.
                        </p>
                    </div>

                    {props.flash?.success && (
                        <div className="alert alert-success" role="status">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            {props.flash.success}
                        </div>
                    )}

                    <div className="row g-4">
                        <div className="col-12 col-xl-7">
                            <section className="bg-white border rounded-4 p-3 p-md-4 h-100">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
                                        <i className="bi bi-person-gear fs-4"></i>
                                    </div>
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Account information</h2>
                                        <p className="small text-muted mb-0">Keep your contact details up to date.</p>
                                    </div>
                                </div>

                                <form onSubmit={saveProfile}>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" htmlFor="settings-name">Full name</label>
                                        <input
                                            id="settings-name"
                                            className={"form-control" + (errors.name ? " is-invalid" : "")}
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            maxLength={255}
                                            autoComplete="name"
                                            required
                                        />
                                        <FieldError message={errors.name} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" htmlFor="settings-email">Email address</label>
                                        <input
                                            id="settings-email"
                                            className="form-control"
                                            value={settings.email ?? ""}
                                            readOnly
                                            disabled
                                        />
                                        <div className="form-text">
                                            Your verified email is read-only here to protect account verification. Email changes should use a separate verification flow.
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold" htmlFor="settings-phone">Mobile number</label>
                                        <input
                                            id="settings-phone"
                                            type="tel"
                                            className={"form-control" + (errors.phone ? " is-invalid" : "")}
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            placeholder="09XXXXXXXXX"
                                            maxLength={11}
                                            autoComplete="tel"
                                        />
                                        <div className="form-text">Use a Philippine mobile number in 09XXXXXXXXX format.</div>
                                        <FieldError message={errors.phone} />
                                    </div>

                                    <button type="submit" className="btn btn-primary fw-bold" disabled={profileWorking}>
                                        {profileWorking ? "SAVING..." : "SAVE ACCOUNT"}
                                    </button>
                                </form>
                            </section>
                        </div>

                        <div className="col-12 col-xl-5">
                            <section className="bg-white border rounded-4 p-3 p-md-4 h-100">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
                                        <i className="bi bi-shield-lock fs-4"></i>
                                    </div>
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Security</h2>
                                        <p className="small text-muted mb-0">Change your password securely.</p>
                                    </div>
                                </div>

                                <form onSubmit={savePassword}>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" htmlFor="settings-current-password">Current password</label>
                                        <input
                                            id="settings-current-password"
                                            type="password"
                                            autoComplete="current-password"
                                            className={"form-control" + (errors.current_password ? " is-invalid" : "")}
                                            value={currentPassword}
                                            onChange={(event) => setCurrentPassword(event.target.value)}
                                            required
                                        />
                                        <FieldError message={errors.current_password} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" htmlFor="settings-new-password">New password</label>
                                        <input
                                            id="settings-new-password"
                                            type="password"
                                            autoComplete="new-password"
                                            className={"form-control" + (errors.password ? " is-invalid" : "")}
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            minLength={8}
                                            required
                                        />
                                        <div className="form-text">At least 8 characters, including uppercase, lowercase, a number, and a symbol.</div>
                                        <FieldError message={errors.password} />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold" htmlFor="settings-confirm-password">Confirm new password</label>
                                        <input
                                            id="settings-confirm-password"
                                            type="password"
                                            autoComplete="new-password"
                                            className={"form-control" + (errors.password_confirmation ? " is-invalid" : "")}
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            required
                                        />
                                        <FieldError message={errors.password_confirmation} />
                                    </div>

                                    <button type="submit" className="btn btn-outline-primary fw-bold" disabled={passwordWorking}>
                                        {passwordWorking ? "UPDATING..." : "UPDATE PASSWORD"}
                                    </button>
                                </form>
                            </section>
                        </div>

                        <div className="col-12">
                            <section className="bg-white border rounded-4 p-3 p-md-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
                                        <i className="bi bi-palette2 fs-4"></i>
                                    </div>
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Appearance</h2>
                                        <p className="small text-muted mb-0">Choose the look of SecureView across pages and devices where you sign in.</p>
                                    </div>
                                </div>

                                <form onSubmit={savePreferences}>
                                    <fieldset className="border-0 p-0 m-0">
                                        <legend className="form-label fw-semibold mb-3">Theme</legend>
                                        <div className="row g-3">
                                            {themeOptions.map((option) => (
                                                <div className="col-12 col-md-4" key={option.value}>
                                                    <button
                                                        type="button"
                                                        className={"settings-theme-option w-100 text-start border rounded-3 p-3 h-100" + (theme === option.value ? " is-selected border-primary" : "")}
                                                        aria-pressed={theme === option.value}
                                                        onClick={() => chooseTheme(option.value)}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                                            <span className="fw-bold"><i className={"bi " + option.icon + " me-2"}></i>{option.label}</span>
                                                            <i className={"bi " + (theme === option.value ? "bi-check-circle-fill text-primary" : "bi-circle text-muted")}></i>
                                                        </div>
                                                        <div className="settings-theme-preview rounded-3 border overflow-hidden mb-3" style={{ height: 58 }}>
                                                            <div className="settings-theme-preview-top d-flex gap-1 align-items-center px-2" style={{ height: 20, background: option.value === "dark" ? "#334155" : option.value === "system" ? "linear-gradient(90deg, #e2e8f0 50%, #334155 50%)" : "#e2e8f0" }}>
                                                                <span className="rounded-circle bg-primary" style={{ width: 6, height: 6 }}></span>
                                                                <span className="rounded-pill" style={{ width: 36, height: 4, background: option.value === "dark" ? "#94a3b8" : "#94a3b8" }}></span>
                                                            </div>
                                                            <div className="d-flex gap-2 p-2">
                                                                <span className="rounded-1" style={{ width: "30%", height: 20, background: option.value === "dark" ? "#334155" : "#cbd5e1" }}></span>
                                                                <span className="rounded-1 flex-grow-1" style={{ height: 20, background: option.value === "dark" ? "#475569" : "#f1f5f9" }}></span>
                                                            </div>
                                                        </div>
                                                        <span className="small text-muted">{option.description}</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <hr className="my-4" />

                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                                        <div>
                                            <div className="fw-semibold">Live notification popups</div>
                                            <div className="small text-muted">Show a small popup when a new in-app notification arrives. Turning this off keeps your notification inbox and unread count intact.</div>
                                        </div>
                                        <div className="form-check form-switch fs-5 flex-shrink-0">
                                            <input
                                                id="settings-notification-popups"
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                checked={notificationPopups}
                                                onChange={(event) => setNotificationPopups(event.target.checked)}
                                            />
                                            <label className="form-check-label small" htmlFor="settings-notification-popups">
                                                {notificationPopups ? "On" : "Off"}
                                            </label>
                                        </div>
                                    </div>

                                    {errors.preferred_theme && <div className="text-danger small mt-3">{errors.preferred_theme}</div>}
                                    {errors.notification_popups_enabled && <div className="text-danger small mt-1">{errors.notification_popups_enabled}</div>}

                                    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mt-4">
                                        <div className="small text-muted">Your theme is previewed immediately and saved to your account when you click Save Preferences.</div>
                                        <button type="submit" className="btn btn-primary fw-bold flex-shrink-0" disabled={preferencesWorking}>
                                            {preferencesWorking ? "SAVING..." : "SAVE PREFERENCES"}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>

                        <div className="col-12">
                            <div className="small text-muted text-center py-2">
                                Settings are saved to your SecureView account. Your email address stays unchanged unless a verified email-change flow is added.
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
