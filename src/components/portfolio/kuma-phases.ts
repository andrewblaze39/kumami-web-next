// src/components/portfolio/kuma-phases.ts

export type KumaPhase = 1 | 2 | 3 | 4;

export const KUMA_PHASES: Record<KumaPhase, {
  name: string;
  tag: string;
  color: string;
  messages: string[];
}> = {
  1: {
    name: 'Phase 1 — Default tips',
    tag: 'DEFAULT',
    color: '#96EDD6',
    messages: [
      "Welcome back! Markets are open and ready 🐾",
      "Tip: A diverse portfolio weathers market storms.",
      "Stay curious — your future self will thank you.",
      "Track your wins. Learn from your losses. Repeat.",
    ],
  },
  2: {
    name: 'Phase 2 — Admin broadcasts',
    tag: 'MARKET ALERT',
    color: '#FACC15',
    messages: [], // Populated from Firestore admin_broadcasts/{id}.message
  },
  3: {
    name: 'Phase 3 — Portfolio AI',
    tag: 'YOUR PORTFOLIO',
    color: '#A78BFA',
    messages: [], // Generated server-side from user's portfolio doc
  },
  4: {
    name: 'Phase 4 — News + Bag',
    tag: 'NEWS + PORTFOLIO',
    color: '#F472B6',
    messages: [], // Server-side: news feed × user holdings → notifications
  },
};
