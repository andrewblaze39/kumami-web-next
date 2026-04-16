'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Newspaper, BookOpen, GraduationCap, Cpu, FileText, Gamepad2, TrendingUp, Users, UserCog } from 'lucide-react';

const quickLinks = [
  { href: '/admin/news', label: 'Publish News', icon: Newspaper },
  { href: '/admin/blog', label: 'Publish Blog', icon: BookOpen },
  { href: '/admin/education', label: 'Publish Education', icon: GraduationCap },
  { href: '/admin/ai-modules', label: 'Publish AI Modules', icon: Cpu },
  { href: '/admin/research', label: 'Publish Research', icon: FileText },
  { href: '/admin/games', label: 'Publish Games', icon: Gamepad2 },
  { href: '/admin/market-analysis', label: 'Market Analysis', icon: TrendingUp },
  { href: '/admin/homepage-partners', label: 'Manage Partners', icon: Users },
  { href: '/admin/role-management', label: 'Role Management', icon: UserCog },
];

export default function AdminDashboardPage() {
  const { userData, currentUser } = useAuth();

  const getRoleDisplay = () => {
    switch (userData?.role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'newsresearchadmin': return 'News & Research Admin';
      case 'newsdrafter': return 'News Drafter';
      case 'gamesadmin': return 'Games Admin';
      case 'marketanalysisadmin': return 'Market Analysis Admin';
      default: return 'User';
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Welcome back, <span className="font-medium">{currentUser?.email}</span>.
        You are logged in as <span className="font-semibold text-[#40e0d0]">{getRoleDisplay()}</span>.
      </p>

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Links</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-[#40e0d0] transition-all no-underline text-gray-800"
          >
            <Icon size={20} className="text-[#40e0d0]" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
