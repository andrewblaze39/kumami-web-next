/**
 * Rich text for admin-authored fields (v1.18, Andrew 29 Oct 2026: bold / italic / underline
 * in every admin text box, shown as formatted while typing, like the Education admin).
 *
 * Storage stays plain text with markers, so every existing value keeps working:
 *   **bold**   *italic*   __underline__   "• " at the start of a line = bullet
 * Article bodies also use "## heading", "- bullet" and [label](url); the article
 * renderers keep handling those.
 *
 * - editorHtml / editorMarkdown: the admin RichTextEditor's two directions (contentEditable).
 * - richTextHtml: safe HTML for showing a short field on the site (HTML-escaped first).
 * - plainText: the text without markers, for card previews, tooltips and meta tags.
 */

export function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Markers → inline HTML. Input must already be HTML-escaped. */
function inline(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
}

/** Stored text → the editor's HTML (what the admin sees while typing). */
export function editorHtml(text: string): string {
  if (!text) return '';
  let html = inline(escapeHtml(text));
  html = html.replace(/^•\s*(.*)$/gm, '<li>$1</li>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<br>\s*(<li>)/g, '$1').replace(/(<\/li>)\s*<br>/g, '$1');
  return html;
}

/** The editor's HTML (after typing / Ctrl+B / Ctrl+I / Ctrl+U) → stored text with markers. */
export function editorMarkdown(html: string): string {
  if (!html) return '';
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b(?:\s[^>]*)?>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi, '__$1__')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i(?:\s[^>]*)?>([\s\S]*?)<\/i>/gi, '*$1*');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n').replace(/<\/?(ul|ol)[^>]*>/gi, '');
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  return text.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
}

/**
 * A short admin field (description, note, summary) → safe inline HTML for the site. Inline only
 * (no <ul>/<p>), so it can sit inside any <p> or <span>: bullets become "• item" lines.
 */
export function richTextHtml(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text.replace(/\r\n/g, '\n'))
    .split('\n')
    .map((line) => {
      const bullet = line.match(/^\s*[•-]\s+(.*)$/);
      return bullet ? `• ${inline(bullet[1])}` : inline(line);
    })
    .join('<br>');
}

/** The text without markers (card previews, tooltips, meta descriptions). */
export function plainText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/^\s*•\s*/gm, '');
}
