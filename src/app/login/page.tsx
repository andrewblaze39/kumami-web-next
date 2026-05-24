import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Log In — Kumami World',
  description: 'Log in to your Kumami World account.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
