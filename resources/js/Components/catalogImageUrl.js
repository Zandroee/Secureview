/**
 * Normalize catalog image values across local development and split-directory Hostinger deployments.
 * Stored values may be absolute URLs, /storage/... URLs, storage/... paths, or relative file paths.
 */
export default function catalogImageUrl(value) {
    if (typeof value !== "string") return "";

    const image = value.trim();
    if (!image) return "";

    // Older imported records may contain localhost URLs from the local XAMPP app.
    const localStorageUrl = image.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/storage\/.*)$/i);
    if (localStorageUrl) return localStorageUrl[1];

    if (/^(?:https?:)?\/\//i.test(image) || /^(?:data|blob):/i.test(image)) {
        return image;
    }

    const normalized = image.replace(/\\/g, "/").replace(/^\/+/, "");

    if (normalized.startsWith("public/storage/")) {
        return "/" + normalized.slice("public/".length);
    }

    if (normalized.startsWith("storage/")) {
        return "/" + normalized;
    }

    if (normalized.startsWith("public/")) {
        return "/storage/" + normalized.slice("public/".length);
    }

    return "/storage/" + normalized;
}
