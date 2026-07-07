import Link from 'next/link';

interface CategoryChipsProps {
  /** Currently active category — 'All', 'Most Popular' or a real category name */
  active?: string;
  /** Real category values derived from published articles (getNewsCategories) */
  categories: string[];
}

/**
 * Category capsules — `All`, then real categories derived from articles,
 * then `Most Popular`. Selection is server-driven via the `?category=` param.
 */
export default function CategoryChips({ active, categories }: CategoryChipsProps) {
  const current = active || 'All';
  // popularity metric TBD — latest for now
  const chips = ['All', ...categories, 'Most Popular'];

  return (
    <div className="w-np-cats">
      {chips.map((cat) => {
        const isActive = cat === current;
        const href =
          cat === 'All'
            ? '/world/news'
            : `/world/news?category=${encodeURIComponent(cat)}`;

        return (
          <Link
            key={cat}
            href={href}
            className={`w-np-cat${isActive ? ' is-active' : ''}`}
          >
            {cat}
          </Link>
        );
      })}
    </div>
  );
}
