// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTimestamp = { seconds: number; toDate?: () => Date } | string | null | undefined;

export function formatTimestamp(timestamp: AnyTimestamp): string {
  if (!timestamp) return 'No date';
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString();
  }
  return String(timestamp);
}

export function formatDate(timestamp: AnyTimestamp): string {
  if (!timestamp) return 'No date';
  const date = typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate
    ? timestamp.toDate()
    : typeof timestamp === 'object' && 'seconds' in timestamp
    ? new Date(timestamp.seconds * 1000)
    : new Date(timestamp as string);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateContent(content: string, maxLength = 150): string {
  if (!content) return '';
  const plainText = content.replace(/\\n/g, ' ').replace(/[*#_`]/g, '');
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
}

export function getFormattedPreviewHtml(content: string): string {
  if (!content) return '';
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

export function formatSelection(
  textareaId: string,
  content: string,
  type: 'bold' | 'italic' | 'underline',
  setContent: (v: string) => void
): void {
  if (typeof document === 'undefined') return;
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);
  if (!selectedText) return;

  const formats = { bold: '**', italic: '*', underline: '__' };
  const marker = formats[type];
  const newText = `${marker}${selectedText}${marker}`;
  setContent(content.substring(0, start) + newText + content.substring(end));
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
