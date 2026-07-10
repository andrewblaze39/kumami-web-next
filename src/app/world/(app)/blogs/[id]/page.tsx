import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getBlogById, getLatestBlogs } from '@/lib/blogs';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------- Markdown renderer (mirrored from the world news/research detail pages) ----------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      const safeLabel = escapeHtml(label);
      // Allow only safe URI schemes; block javascript:, data:, vbscript:, etc.
      const isSafe = /^(https?:|mailto:|\/|#|[^:]*$)/.test(href.trim());
      if (!isSafe) return safeLabel;
      const safeHref = href.replace(/"/g, '&quot;');
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:var(--accent2);text-decoration:underline">${safeLabel}</a>`;
    });
}

function renderMarkdown(text: string | undefined): string {
  if (!text) return '';
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const blocks = normalized.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      const isBulletBlock = lines.every(
        (l) => /^\s*[-*•]\s+/.test(l) || l.trim() === ''
      );
      if (isBulletBlock && lines.some((l) => /^\s*[-*•]\s+/.test(l))) {
        const items = lines
          .filter((l) => /^\s*[-*•]\s+/.test(l))
          .map(
            (l) =>
              `<li style="margin-bottom:4px">${parseInline(
                escapeHtml(l.replace(/^\s*[-*•]\s+/, ''))
              )}</li>`
          )
          .join('');
        return `<ul style="list-style:disc;padding-left:20px;margin:12px 0">${items}</ul>`;
      }

      const heading = block.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const body = parseInline(escapeHtml(heading[2]));
        const size = level <= 2 ? '22px' : level === 3 ? '18px' : '15px';
        const weight = level <= 3 ? 800 : 700;
        return `<h${level} style="font-size:${size};font-weight:${weight};margin:28px 0 10px;letter-spacing:-0.02em;color:var(--ink)">${body}</h${level}>`;
      }

      return `<p style="margin-bottom:16px;line-height:1.72;color:rgba(241,247,244,0.85)">${parseInline(
        escapeHtml(block).replace(/\n/g, '<br />')
      )}</p>`;
    })
    .join('');
}

// ---------- Metadata ----------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getBlogById(id);

  const fallbackTitle = 'Blog — Kumami World';
  const fallbackDesc = 'Blog posts and updates from the Kumami World team.';

  if (!post) {
    return { title: fallbackTitle, description: fallbackDesc };
  }

  const title = post.title ? `${post.title} — Kumami Blog` : fallbackTitle;
  const rawDesc =
    post.summary ||
    (post.content1 || post.content || '')
      .replace(/[#*_>`~\[\]()!-]/g, '')
      .trim()
      .substring(0, 160) ||
    fallbackDesc;
  const description = rawDesc.length > 160 ? `${rawDesc.substring(0, 157)}...` : rawDesc;

  const ogImage =
    post.detailImageUrl ||
    post.thumbnailImageUrl ||
    post.imageUrl ||
    'https://kumami.world/og-default.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kumami.world/world/blogs/${id}`,
      type: 'article',
      ...(post.createdAt && { publishedTime: new Date(post.createdAt).toISOString() }),
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title || 'Kumami Blog' }],
    },
  };
}

// ---------- Related row ----------

function BlogRow({
  post,
}: {
  post: Awaited<ReturnType<typeof getLatestBlogs>>[number];
}) {
  const thumbUrl = post.thumbnailImageUrl || post.imageUrl;
  const thumbBackground = thumbUrl
    ? `url(${JSON.stringify(thumbUrl)})`
    : 'linear-gradient(135deg, var(--panel-2), var(--panel-3))';

  return (
    <Link href={`/world/blogs/${post.id}`} className="w-np-row">
      <div
        className="w-np-thumb"
        style={{ backgroundImage: thumbBackground }}
        role="img"
        aria-label={post.title}
      />
      <div className="w-np-row-body">
        {post.category && <span className="w-np-kicker">{post.category}</span>}
        <h3>{post.title}</h3>
      </div>
    </Link>
  );
}

// ---------- Page ----------

export default async function WorldBlogDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getBlogById(id);

  if (!post || post.status === 'draft') notFound();

  const formattedDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const bodyOneHtml = renderMarkdown(post.content1 || post.content);
  const bodyTwoHtml = renderMarkdown(post.content2);

  const heroImage = post.detailImageUrl || post.thumbnailImageUrl || post.imageUrl;

  // Related blogs for the sidebar
  const latest = await getLatestBlogs(8);
  const related = latest.filter((p) => p.id !== id).slice(0, 5);

  return (
    <div className="w-content-inner">
      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: 'var(--muted)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/world/blogs"
          style={{ color: 'var(--muted)', textDecoration: 'none' }}
        >
          Blogs
        </Link>
        <ChevronRight size={13} strokeWidth={2.5} />
        {post.category && (
          <>
            <span style={{ color: 'var(--muted)' }}>{post.category}</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </>
        )}
        <span
          style={{
            color: 'var(--ink)',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
          }}
        >
          {post.title}
        </span>
      </nav>

      {/* Two-column: article + related sidebar */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}
        className="w-article-grid"
      >
        {/* ── Main article ── */}
        <article>
          {/* Hero image */}
          {heroImage && (
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                marginBottom: '24px',
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'var(--panel-2)',
                aspectRatio: '3/2',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={post.title ?? 'Blog cover'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            {post.category && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent2)',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-2)',
                  background: 'var(--panel-2)',
                }}
              >
                {post.category}
              </span>
            )}
            {post.isPremium && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
                }}
              >
                Premium
              </span>
            )}
            {formattedDate && (
              <time style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {formattedDate}
              </time>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(22px, 3.5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.18,
              color: 'var(--ink)',
            }}
          >
            {post.title}
          </h1>

          {/* Summary / pull-quote */}
          {post.summary && (
            <p
              style={{
                fontSize: '16px',
                color: 'var(--muted)',
                lineHeight: 1.65,
                marginBottom: '24px',
                borderLeft: '3px solid var(--accent)',
                paddingLeft: '14px',
                fontStyle: 'italic',
              }}
            >
              {post.summary}
            </p>
          )}

          {/* Content section 1 */}
          {bodyOneHtml && (
            <div
              style={{ fontSize: '15px', lineHeight: 1.75, maxWidth: '680px' }}
              dangerouslySetInnerHTML={{ __html: bodyOneHtml }}
            />
          )}

          {/* Second (detail) image between sections */}
          {post.detailImage2Url && (
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                margin: '24px 0',
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'var(--panel-2)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.detailImage2Url}
                alt={post.title ?? 'Blog detail'}
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Content section 2 */}
          {bodyTwoHtml && (
            <div
              style={{ fontSize: '15px', lineHeight: 1.75, maxWidth: '680px' }}
              dangerouslySetInnerHTML={{ __html: bodyTwoHtml }}
            />
          )}
        </article>

        {/* ── Related sidebar ── */}
        {related.length > 0 && (
          <aside>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted-2)',
              }}
            >
              More Blogs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {related.map((p) => (
                <BlogRow key={p.id} post={p} />
              ))}
            </div>
            <Link
              href="/world/blogs"
              style={{
                display: 'block',
                marginTop: '10px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent)',
                textDecoration: 'none',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--panel-2)',
                transition: 'background 0.14s',
              }}
            >
              View all blogs →
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
