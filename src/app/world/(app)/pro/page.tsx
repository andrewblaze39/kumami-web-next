import ProTeaser from '@/components/world/pro/ProTeaser';

export const metadata = {
  title: 'Kumami Pro Features',
  description: 'Real-time alpha, smart money tracking and exclusive access with Kumami Pro.',
};

export default function ProPage() {
  return (
    <div className="w-content-inner">
      <ProTeaser />
    </div>
  );
}
