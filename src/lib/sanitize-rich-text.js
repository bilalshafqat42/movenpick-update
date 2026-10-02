import "server-only";

import sanitizeHtml from "sanitize-html";

/*
 * Second line of defence for admin-authored rich text (the Privacy and Terms
 * bodies), applied just before it is rendered as raw HTML.
 *
 * The central panel already sanitises on save, and that remains the primary
 * control. This exists because the public site should not be one bad panel
 * deploy, or one compromised editor account, away from serving script to
 * every visitor. The CSP keeps 'unsafe-inline' for GTM, so it would not
 * stop an injected inline handler on its own.
 *
 * The allowlist is what a legal page needs: structure, emphasis, lists,
 * links and simple tables. No images, iframes, styles, or event handlers.
 */
const OPTIONS = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "small", "sup", "sub",
    "ul", "ol", "li",
    "blockquote", "a", "span",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  transformTags: {
    // A new tab opened by a CMS link must not get a handle on this page.
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichText(html) {
  return typeof html === "string" ? sanitizeHtml(html, OPTIONS) : "";
}
