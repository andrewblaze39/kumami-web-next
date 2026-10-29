/**
 * Shows an admin-authored field with its bold / italic / underline (v1.18). The text is
 * HTML-escaped before the markers are applied (lib/richText.ts), so admin input can't
 * inject markup. Works in server and client components.
 */
import { richTextHtml } from '@/lib/richText';

export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return <span className={className} dangerouslySetInnerHTML={{ __html: richTextHtml(text) }} />;
}
