'use client';

import { useState } from 'react';
import { Compass } from 'lucide-react';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';

/**
 * AdminPageTour — a "How to use this page" button that launches the shared
 * guided tour on any admin page. Reuses the same spotlight walkthrough as the
 * world/Pro tours (styles are bundled with ProductTour, so it works here even
 * though admin pages don't load world.css).
 */
export default function AdminPageTour({ steps, label = 'How to use this page' }: { steps: TourStep[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="w-tour-trigger" onClick={() => setOpen(true)}>
        <Compass size={14} /> {label}
      </button>
      {open && <ProductTour steps={steps} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Standard steps for a Pro-dashboard content admin page. Every Pro publisher
 * works the same way, so the tour explains the shared publish/draft/edit flow
 * and what changes on the user-facing tab.
 */
export function proAdminTourSteps(name: string, tabPath: string): TourStep[] {
  return [
    {
      title: `Publishing ${name}`,
      body: `This page controls the “${name}” tab on the Pro dashboard (${tabPath}). Here's how it works.`,
    },
    {
      selector: '[data-tour="admin-publish"]',
      title: 'Publish = live now',
      body: `Fill the form and click Publish — the item appears on the ${name} tab immediately for Pro users.`,
    },
    {
      selector: '[data-tour="admin-draft"]',
      title: 'Save as Draft = hidden',
      body: 'Save as Draft to store your work without showing it to users. Drafts never appear on the Pro tab until you publish them.',
    },
    {
      selector: '[data-tour="admin-list"]',
      title: 'Manage what you’ve made',
      body: 'Everything you create is listed here with its status. Edit updates it (and the change shows on the tab in real time); Delete removes it.',
    },
    {
      title: 'That’s it',
      body: `Publish or edit an item, then open ${tabPath} in the Pro dashboard to see it live. Drafts stay private until published.`,
    },
  ];
}
