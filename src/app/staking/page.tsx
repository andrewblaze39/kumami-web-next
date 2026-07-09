import { redirect } from 'next/navigation';

// Legacy route — staking is not live yet; send users to the shelled coming-soon page.
export default function StakingRedirect() {
  redirect('/world/subscribe');
}
