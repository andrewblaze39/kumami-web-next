import { describe, it, expect } from 'vitest';
import { editorHtml, editorMarkdown, plainText, richTextHtml } from '../richText';

describe('richTextHtml (showing an admin field on the site)', () => {
  it('renders bold, italic and underline', () => {
    expect(richTextHtml('**Big** news, *soon*, __today__')).toBe('<strong>Big</strong> news, <em>soon</em>, <u>today</u>');
  });

  it('leaves plain text from before v1.18 unchanged', () => {
    expect(richTextHtml('Mainnet hard fork on 3 Nov.')).toBe('Mainnet hard fork on 3 Nov.');
  });

  it('escapes HTML so admin text can never inject markup', () => {
    expect(richTextHtml('<img src=x onerror=alert(1)> **ok**')).toBe('&lt;img src=x onerror=alert(1)&gt; <strong>ok</strong>');
  });

  it('keeps line breaks and shows "• " / "- " lines as bullet lines (inline HTML only)', () => {
    expect(richTextHtml('Line one\nLine two')).toBe('Line one<br>Line two');
    expect(richTextHtml('Steps:\n• First\n- **Second**\nDone')).toBe('Steps:<br>• First<br>• <strong>Second</strong><br>Done');
  });

  it('does not treat a lone asterisk or arithmetic as italic', () => {
    expect(richTextHtml('5 * 3 = 15')).toBe('5 * 3 = 15');
  });

  it('is empty for missing values', () => {
    expect(richTextHtml(undefined)).toBe('');
    expect(richTextHtml('')).toBe('');
  });
});

describe('admin editor round trip', () => {
  const samples = [
    'Plain description with no formatting.',
    '**Bold** and *italic* and __underline__.',
    'Two lines\nof text',
    'Para one\n\nPara two',
    '• one\n• two',
    '## Heading kept as text\n\nBody with [a link](https://kumami.world) and 5 * 3.',
    'Tom & Jerry <3',
  ];
  it.each(samples)('stored text survives load → save unchanged: %s', (text) => {
    expect(editorMarkdown(editorHtml(text))).toBe(text);
  });

  it('formatting applied in the editor (browser tags) is saved as markers', () => {
    expect(editorMarkdown('<b>Bold</b> <i>it</i> <u>under</u>')).toBe('**Bold** *it* __under__');
    expect(editorMarkdown('<div>first</div><div>second</div>')).toBe('first\nsecond');
  });
});

describe('plainText', () => {
  it('strips markers for previews', () => {
    expect(plainText('**Big** *news* __now__\n• item')).toBe('Big news now\nitem');
  });
});
