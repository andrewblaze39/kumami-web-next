import type { Metadata } from 'next';
import ProfileContent from '@/components/ProfileContent';

export const metadata: Metadata = {
  title: 'Profile — Kumami World',
  description: 'Your Kumami account, subscription and referrals.',
};

/**
 * /world/profile — auth is already enforced by WorldProtected in the (app)
 * layout, so the legacy ProtectedRoute wrapper is intentionally NOT used
 * here (it would bounce to the retired /signup flow).
 */
export default function WorldProfilePage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed w-embed-profile">
      <ProfileContent />
    </div>
  );
}
