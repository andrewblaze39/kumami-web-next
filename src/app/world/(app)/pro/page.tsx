import WorldProContent from '@/components/world/pro/WorldProContent';

export const metadata = {
  title: 'Kumami Pro Features',
  description: 'Real-time alpha, smart money tracking and exclusive access with Kumami Pro.',
};

export default function ProPage() {
  // No w-content-inner: the Pro dashboard is wide, so it renders at full
  // content width (world.css lifts the .w-content cap for .w-pro-root).
  return <WorldProContent />;
}
