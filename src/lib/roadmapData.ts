export const TEAM_MEMBERS = ['Andrew', 'Aria', 'Nova', 'Rex', 'TBD'];

export const CATEGORIES = ['All', 'Pro', 'Website', 'AI', 'Infrastructure', 'Mobile', 'Admin'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Pro: '#7c3aed',
  Website: '#3b82f6',
  AI: '#0d9488',
  Infrastructure: '#ea580c',
  Mobile: '#ec4899',
  Admin: '#6b7280',
};

export const STATUS_COLORS: Record<string, string> = {
  'planned': '#6b7280',
  'in-progress': '#40e0d0',
  'in-review': '#f59e0b',
  'done': '#22c55e',
};

export const STATUS_LABELS: Record<string, string> = {
  'planned': 'Planned',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'done': 'Done',
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#eab308',
  P3: '#6b7280',
};

export const COLUMNS = ['planned', 'in-progress', 'in-review', 'done'] as const;
export type Status = typeof COLUMNS[number];

export interface RoadmapItem {
  id: string;
  title: string;
  category: string;
  status: Status;
  pic: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  notes?: string;
  targetDate: string | null;
  order: number;
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  // ── DONE ──
  { id: 'r1', title: 'CRA → Next.js Migration (Public Pages)', category: 'Website', status: 'done', pic: 'Aria', priority: 'P1', notes: '37/37 public pages migrated. Home, Auth, News, Education, Research, Blogs, Games, AI Labs, Partners, Profile all done.', targetDate: '2026-04-16', order: 1 },
  { id: 'r2', title: 'Kumami Pro — Alpha Room', category: 'Pro', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'Admin dashboard to post alpha calls. Live in CRA Pro Dashboard.', targetDate: '2026-04-10', order: 2 },
  { id: 'r3', title: 'Kumami Pro — Market Analysis Tab', category: 'Pro', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'Admin can push market analyses to Pro members.', targetDate: '2026-04-10', order: 3 },
  { id: 'r4', title: 'Kuma AI Chatroom (CoinMarketCap)', category: 'AI', status: 'done', pic: 'Nova', priority: 'P1', notes: 'AI chatbot connected to CoinMarketCap MCP. 13 live crypto data endpoints.', targetDate: '2026-04-11', order: 4 },
  { id: 'r5', title: 'Crypto Address Tracker (Alchemy)', category: 'Pro', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'Telegram-style wallet tracker inside Kuma AI Chatroom. Alchemy API. ETH/Base/Arb.', targetDate: '2026-05-07', order: 5 },
  { id: 'r6', title: 'Portfolio Manager (Core)', category: 'Pro', status: 'done', pic: 'Andrew', priority: 'P2', notes: 'Add crypto assets, pie chart visualization. No AI yet.', targetDate: '2026-04-15', order: 6 },
  { id: 'r7', title: 'Stripe Payment Integration (Sandbox)', category: 'Infrastructure', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'Stripe fiat integrated and sandbox-tested.', targetDate: '2026-04-15', order: 7 },
  { id: 'r8', title: 'NOWPayments Crypto Integration', category: 'Infrastructure', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'NOWPayments crypto payment integrated. Needs production API key to go live.', targetDate: '2026-04-15', order: 8 },
  { id: 'r9', title: 'Referral System', category: 'Pro', status: 'done', pic: 'Andrew', priority: 'P2', notes: 'Unique referral codes tracked in Firestore. Supports Stripe and NOWPayments.', targetDate: '2026-04-15', order: 9 },
  { id: 'r10', title: 'Admin Panel (Full CRUD)', category: 'Admin', status: 'done', pic: 'Andrew', priority: 'P1', notes: 'CRUD for News, Education, Research, Blogs, Games, AI Modules, Partners, Market Analysis, Role Management. Stays in CRA permanently.', targetDate: '2026-04-10', order: 10 },
  // ── IN PROGRESS ──
  { id: 'r11', title: 'Stripe — Go Live (Production)', category: 'Infrastructure', status: 'in-progress', pic: 'Andrew', priority: 'P0', notes: 'Need to register live Stripe account and swap sandbox keys for production. Primary monetisation blocker.', targetDate: '2026-05-15', order: 1 },
  { id: 'r12', title: 'NOWPayments — Go Live (Production)', category: 'Infrastructure', status: 'in-progress', pic: 'Andrew', priority: 'P0', notes: 'Swap to production API key and IPN secret.', targetDate: '2026-05-15', order: 2 },
  { id: 'r13', title: 'RAG — KumaAI Company Knowledge Base', category: 'AI', status: 'in-progress', pic: 'Nova', priority: 'P1', notes: 'Supabase pgvector setup done. n8n integration pending. 768-dim Gemini embeddings ready.', targetDate: '2026-05-20', order: 3 },
  { id: 'r14', title: 'Next.js — Switch Live Website', category: 'Website', status: 'in-progress', pic: 'Andrew', priority: 'P1', notes: 'Replace current Firebase Hosted CRA site with Next.js. Infra + DNS cutover pending.', targetDate: '2026-05-30', order: 4 },
  // ── IN REVIEW ──
  { id: 'r15', title: 'Firestore Security Rules Audit', category: 'Infrastructure', status: 'in-review', pic: 'Rex', priority: 'P0', notes: 'S-1: update logic bug (any admin can publish). S-2: storage rules too permissive. S-3: role functions crash on missing user doc.', targetDate: '2026-05-10', order: 1 },
  { id: 'r16', title: 'Stripe Yearly/Lifetime Price IDs', category: 'Infrastructure', status: 'in-review', pic: 'Andrew', priority: 'P1', notes: 'Yearly and lifetime Stripe price IDs are placeholders. Need real product/price IDs.', targetDate: '2026-05-10', order: 2 },
  // ── PLANNED ──
  { id: 'r17', title: 'AI Portfolio Suggestions', category: 'Pro', status: 'planned', pic: 'TBD', priority: 'P2', notes: 'AI analyses user portfolio and surfaces actionable investment recommendations.', targetDate: null, order: 1 },
  { id: 'r18', title: 'Automated News Generation (RSS → AI)', category: 'AI', status: 'planned', pic: 'Nova', priority: 'P1', notes: 'n8n RSS feeds → AI rewrite → auto-publish to Firestore. Draft-first. Deduplication needed.', targetDate: null, order: 2 },
  { id: 'r19', title: 'Kumami AI Short Insights per Article', category: 'AI', status: 'planned', pic: 'Nova', priority: 'P2', notes: 'AI generates 3-5 bullet takeaways per news article. Shown in news detail page.', targetDate: null, order: 3 },
  { id: 'r20', title: 'AI Labs — Workshops', category: 'AI', status: 'planned', pic: 'TBD', priority: 'P3', notes: 'Workshop modules under AI Labs. Currently a Coming Soon stub.', targetDate: null, order: 4 },
  { id: 'r21', title: 'AI Labs — Submissions', category: 'AI', status: 'planned', pic: 'TBD', priority: 'P3', notes: 'User submission portal under AI Labs. Currently a Coming Soon stub.', targetDate: null, order: 5 },
  { id: 'r22', title: 'Mobile App (Flutter)', category: 'Mobile', status: 'planned', pic: 'TBD', priority: 'P2', notes: 'Flutter mobile app. Features mostly on-par with website. Missing: Crypto Address Tracker chatroom.', targetDate: null, order: 6 },
  { id: 'r23', title: 'Mobile — Crypto Address Tracker', category: 'Mobile', status: 'planned', pic: 'TBD', priority: 'P2', notes: 'Port Alchemy-powered wallet tracker chatroom to mobile app.', targetDate: null, order: 7 },
  { id: 'r24', title: 'Sitemap & Robots.txt', category: 'Website', status: 'planned', pic: 'Aria', priority: 'P2', notes: 'Auto-generated sitemap for Next.js. After migration goes live.', targetDate: null, order: 8 },
  { id: 'r25', title: 'Image Optimization (next/image)', category: 'Website', status: 'planned', pic: 'Aria', priority: 'P3', notes: 'Migrate img tags to next/image with remotePatterns config.', targetDate: null, order: 9 },
  { id: 'r26', title: 'CSP Hardening', category: 'Infrastructure', status: 'planned', pic: 'Rex', priority: 'P3', notes: 'Tighten Content-Security-Policy, proxy external CoinGecko URLs.', targetDate: null, order: 10 },
  { id: 'r27', title: 'Admin — Roadmap Manager (CRUD)', category: 'Admin', status: 'planned', pic: 'Aria', priority: 'P2', notes: 'CRUD for roadmap items from this Kanban view. Currently read-only seeded data.', targetDate: null, order: 11 },
];
