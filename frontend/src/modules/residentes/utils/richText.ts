const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

const markdownToHtml = (value: string) =>
    escapeHtml(value.replaceAll("\r\n", "\n"))
        .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\+\+([\s\S]+?)\+\+/g, "<u>$1</u>")
        .replace(/\*([\s\S]+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br />");

const allowedTags = new Set([
    "STRONG",
    "EM",
    "U",
    "BR",
    "B",
    "I",
    "DIV",
    "P",
    "SPAN",
]);

const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent ?? "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();
    const children = Array.from(element.childNodes).map(serializeNode).join("");

    if (!allowedTags.has(tagName)) {
        return children;
    }

    if (tagName === "B") {
        return `<strong>${children}</strong>`;
    }

    if (tagName === "I") {
        return `<em>${children}</em>`;
    }

    if (tagName === "BR") {
        return "<br />";
    }

    if (tagName === "DIV" || tagName === "P") {
        return `<div>${children || "<br />"}</div>`;
    }

    return `<${tagName.toLowerCase()}>${children}</${tagName.toLowerCase()}>`;
};

export const sanitizeRichHtml = (value: string) => {
    if (!value) return "";

    const parser = new DOMParser();
    const document = parser.parseFromString(`<div>${value}</div>`, "text/html");
    const root = document.body.firstElementChild;

    if (!root) return "";

    return Array.from(root.childNodes).map(serializeNode).join("");
};

export const renderRichText = (value: string) => {
    const normalized = (value ?? "").replaceAll("\r\n", "\n");

    if (!normalized.trim()) return "";

    if (/<[a-z][\s\S]*>/i.test(normalized)) {
        return sanitizeRichHtml(normalized);
    }

    return markdownToHtml(normalized);
};

export const richTextPlainText = (value: string) => {
    const normalized = (value ?? "").replaceAll("\r\n", "\n");

    if (!normalized.trim()) return "";

    if (/<[a-z][\s\S]*>/i.test(normalized)) {
        const parser = new DOMParser();
        const document = parser.parseFromString(`<div>${normalized}</div>`, "text/html");
        return document.body.textContent?.replaceAll("\u00a0", " ").trim() ?? "";
    }

    return normalized
        .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
        .replace(/\+\+([\s\S]+?)\+\+/g, "$1")
        .replace(/\*([\s\S]+?)\*/g, "$1")
        .trim();
};