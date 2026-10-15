const NON_SORTABLE_HEADERS = new Set([
    "action",
    "actions",
    "view",
    "details",
    "options",
    "controls",
    "edit",
    "delete",
]);

const MONTH_PATTERN = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;

function headerLabel(header) {
    const clone = header.cloneNode(true);
    clone.querySelectorAll(".sv-sort-indicator").forEach((indicator) => indicator.remove());
    return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function shouldEnhanceHeader(header) {
    if (header.dataset.sortable === "false") return false;
    if (header.querySelector("button, a, input, select, textarea")) return false;

    const label = headerLabel(header).toLowerCase().replace(/\s+/g, " ");
    if (!label) return false;
    if (NON_SORTABLE_HEADERS.has(label)) return false;

    return true;
}

function enhanceTable(table) {
    if (!(table instanceof HTMLTableElement)) return;
    if (table.dataset.sortable === "false") return;

    table.querySelectorAll("thead th").forEach((header) => {
        if (header.dataset.svSortableReady === "true") return;
        if (!shouldEnhanceHeader(header)) return;

        header.dataset.svSortableReady = "true";
        header.classList.add("sv-sortable-column");
        header.setAttribute("tabindex", "0");
        header.setAttribute("aria-sort", "none");
        header.setAttribute("title", "Sort by " + headerLabel(header));

        const indicator = document.createElement("span");
        indicator.className = "sv-sort-indicator";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "↕";
        header.appendChild(indicator);
    });
}

function enhanceTables(root) {
    if (!root) return;

    if (root instanceof HTMLTableElement) {
        enhanceTable(root);
    } else if (root instanceof Element) {
        const parentTable = root.closest("table");
        if (parentTable) enhanceTable(parentTable);
    }

    if (typeof root.querySelectorAll === "function") {
        root.querySelectorAll("table").forEach(enhanceTable);
    }
}

function sortValue(cell) {
    const raw = (
        cell?.getAttribute("data-sort-value") ??
        cell?.innerText ??
        cell?.textContent ??
        ""
    ).replace(/\s+/g, " ").trim();

    if (!raw) return { type: "empty", value: "" };

    const looksLikeDate =
        MONTH_PATTERN.test(raw) ||
        /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(raw) ||
        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(raw);

    if (looksLikeDate) {
        const timestamp = Date.parse(raw);
        if (Number.isFinite(timestamp)) {
            return { type: "date", value: timestamp };
        }
    }

    const numeric = raw
        .replace(/[₱$€£¥,\s%]/g, "")
        .replace(/^PHP/i, "");

    if (/^[-+]?\d+(?:\.\d+)?$/.test(numeric)) {
        return { type: "number", value: Number(numeric) };
    }

    return { type: "text", value: raw.toLocaleLowerCase() };
}

function compareCells(leftCell, rightCell) {
    const left = sortValue(leftCell);
    const right = sortValue(rightCell);

    if (left.type === "empty" && right.type !== "empty") return 1;
    if (right.type === "empty" && left.type !== "empty") return -1;

    if (left.type === right.type && left.type !== "text" && left.type !== "empty") {
        return left.value - right.value;
    }

    return String(left.value).localeCompare(String(right.value), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

function updateSortIndicators(table, activeHeader, direction) {
    table.querySelectorAll("thead th.sv-sortable-column").forEach((header) => {
        const indicator = header.querySelector(".sv-sort-indicator");
        if (!indicator) return;

        if (header === activeHeader) {
            indicator.textContent = direction === "asc" ? "▲" : "▼";
            header.setAttribute(
                "aria-sort",
                direction === "asc" ? "ascending" : "descending"
            );
            header.title =
                "Sorted " +
                (direction === "asc" ? "ascending" : "descending") +
                " by " +
                headerLabel(header) +
                ". Click to reverse the order.";
        } else {
            indicator.textContent = "↕";
            header.setAttribute("aria-sort", "none");
            header.title = "Sort by " + headerLabel(header);
        }
    });
}

function sortTableByHeader(header) {
    const table = header.closest("table");
    const tableBody = table?.tBodies?.[0];
    if (!table || !tableBody || table.dataset.sortable === "false") return;

    const headerRow = header.parentElement;
    const columnIndex = Array.from(headerRow.cells).indexOf(header);
    if (columnIndex < 0) return;

    const sameColumn = table.dataset.svSortColumn === String(columnIndex);
    const direction =
        sameColumn && table.dataset.svSortDirection === "asc" ? "desc" : "asc";
    const multiplier = direction === "asc" ? 1 : -1;

    const allRows = Array.from(tableBody.rows);
    const sortableRows = [];
    const fixedRows = [];

    allRows.forEach((row, index) => {
        const isEmptyState = Array.from(row.cells).some(
            (cell) => Number(cell.colSpan) > 1
        );

        if (isEmptyState || !row.cells[columnIndex]) {
            fixedRows.push({ row, index });
        } else {
            sortableRows.push({
                row,
                index,
                cell: row.cells[columnIndex],
            });
        }
    });

    sortableRows.sort((left, right) => {
        const result = compareCells(left.cell, right.cell) * multiplier;
        return result || left.index - right.index;
    });

    sortableRows.forEach(({ row }) => tableBody.appendChild(row));
    fixedRows.forEach(({ row }) => tableBody.appendChild(row));

    table.dataset.svSortColumn = String(columnIndex);
    table.dataset.svSortDirection = direction;
    updateSortIndicators(table, header, direction);
}

function injectStyles() {
    if (document.getElementById("secureview-table-sorting-styles")) return;

    const style = document.createElement("style");
    style.id = "secureview-table-sorting-styles";
    style.textContent = `
        th.sv-sortable-column {
            cursor: pointer;
            user-select: none;
        }

        th.sv-sortable-column:hover {
            background-color: rgba(13, 110, 253, 0.055);
        }

        th.sv-sortable-column:focus-visible {
            outline: 2px solid #0d6efd;
            outline-offset: -2px;
        }

        .sv-sort-indicator {
            display: inline-block;
            min-width: 0.9em;
            margin-left: 0.35rem;
            color: #6c757d;
            font-size: 0.72em;
            vertical-align: 0.08em;
            white-space: nowrap;
        }

        th[aria-sort="ascending"] .sv-sort-indicator,
        th[aria-sort="descending"] .sv-sort-indicator {
            color: #0d6efd;
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

export function installTableSorting() {
    if (typeof document === "undefined") return;
    if (document.documentElement.dataset.secureviewTableSorting === "installed") return;

    document.documentElement.dataset.secureviewTableSorting = "installed";
    injectStyles();
    enhanceTables(document);

    document.addEventListener("click", (event) => {
        if (event.target.closest("a, button, input, select, textarea")) return;

        const header = event.target.closest("thead th.sv-sortable-column");
        if (header) sortTableByHeader(header);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        const header = event.target.closest("thead th.sv-sortable-column");
        if (!header) return;

        event.preventDefault();
        sortTableByHeader(header);
    });

    const Observer = document.defaultView?.MutationObserver;
    if (Observer && document.body) {
        const observer = new Observer((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        enhanceTables(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
}
