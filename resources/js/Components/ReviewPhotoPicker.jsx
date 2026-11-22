import { useEffect, useMemo } from "react";

export function reviewPhotoUrl(path) {
    const value = String(path ?? "");
    if (!value) return "";
    if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
    return "/storage/" + value.replace(/^\/+/, "");
}

export default function ReviewPhotoPicker({
    id = "review-photos",
    files = [],
    onFilesChange = () => {},
    existingImages = [],
    removedImages = [],
    onRemovedImagesChange = () => {},
    maxPhotos = 5,
}) {
    const keptImages = existingImages.filter((image) => !removedImages.includes(image));
    const availableSlots = Math.max(0, maxPhotos - keptImages.length);

    const previews = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files]
    );

    useEffect(() => () => {
        previews.forEach(({ url }) => URL.revokeObjectURL(url));
    }, [previews]);

    const toggleExistingImage = (image) => {
        onRemovedImagesChange(
            removedImages.includes(image)
                ? removedImages.filter((candidate) => candidate !== image)
                : [...removedImages, image]
        );
    };

    const selectFiles = (event) => {
        const selected = Array.from(event.target.files ?? []);
        onFilesChange(selected.slice(0, availableSlots));
        event.target.value = "";
    };

    return (
        <section className="review-photo-picker mb-3">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                    <label htmlFor={id} className="form-label fw-semibold mb-1">Photos (optional)</label>
                    <div className="small text-muted">Add up to {maxPhotos} photos. JPEG, PNG, or WebP, maximum 5 MB each.</div>
                </div>
                <span className="badge rounded-pill bg-body-secondary text-body border flex-shrink-0">
                    {keptImages.length + files.length}/{maxPhotos}
                </span>
            </div>

            {existingImages.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                    {existingImages.map((image) => {
                        const removed = removedImages.includes(image);
                        return (
                            <div className={"review-photo-tile " + (removed ? "is-removed" : "")} key={image}>
                                <img src={reviewPhotoUrl(image)} alt="Previously uploaded review photo" loading="lazy" />
                                <button
                                    type="button"
                                    className={"btn btn-sm " + (removed ? "btn-outline-secondary" : "btn-outline-danger")}
                                    onClick={() => toggleExistingImage(image)}
                                    aria-label={(removed ? "Keep " : "Remove ") + "review photo"}
                                >
                                    <i className={"bi " + (removed ? "bi-arrow-counterclockwise" : "bi-x-lg")} />
                                    <span className="visually-hidden">{removed ? "Keep photo" : "Remove photo"}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <input
                id={id}
                type="file"
                className="form-control"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={availableSlots <= 0}
                onChange={selectFiles}
            />

            {availableSlots <= 0 && (
                <div className="small text-muted mt-1">You have reached the photo limit. Remove a saved photo to add another.</div>
            )}

            {files.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                    {previews.map(({ file, url }, index) => (
                        <div className="review-photo-tile" key={url}>
                            <img src={url} alt={"Selected review photo " + (index + 1)} />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                                aria-label={"Remove selected photo " + (index + 1)}
                            >
                                <i className="bi bi-x-lg" />
                                <span className="visually-hidden">Remove selected photo</span>
                            </button>
                            <span className="small text-muted text-truncate d-block" title={file.name}>{file.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
