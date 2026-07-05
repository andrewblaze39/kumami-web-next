import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './world.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kumami World',
  description: 'Where Web3 is made simple.',
};

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`world-root ${jakarta.variable}`}>
      {children}
    </div>
  );
}
