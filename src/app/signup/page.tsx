import type { Metadata } from 'next';
import SignupClient from './SignupClient';

export const metadata: Metadata = {
  title: 'Sign Up — Kumami World',
  description: 'Create your Kumami World account.',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupClient />;
}
