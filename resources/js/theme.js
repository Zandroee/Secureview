let systemThemeListenerRegistered = false;

const allowedThemes = ["system", "light", "dark"];

export function applyUserTheme(preference) {
    const root = document.documentElement;
    const selected = allowedThemes.includes(preference) ? preference : "system";
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const resolvedTheme = selected === "system"
        ? (media.matches ? "dark" : "light")
        : selected;

    root.setAttribute("data-theme-preference", selected);
    root.setAttribute("data-bs-theme", resolvedTheme);

    if (!systemThemeListenerRegistered) {
        media.addEventListener("change", () => {
            const currentPreference = root.getAttribute("data-theme-preference") || "system";
            if (currentPreference === "system") {
                root.setAttribute("data-bs-theme", media.matches ? "dark" : "light");
            }
        });
        systemThemeListenerRegistered = true;
    }
}
