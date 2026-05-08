'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Menu,
  Newspaper,
  BookOpen,
  GraduationCap,
  Cpu,
  FileText,
  Gamepad2,
  TrendingUp,
  Users,
  MessageCircle,
  Video,
  UserCog,
  Map,
  PlusCircle,
  Edit,
  Home,
  Building,
  Bell,
  MessageSquare,
  Play,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Draft Counter Component ---
function DraftCounter({ collectionName, statusField = 'status' }: { collectionName: string; statusField?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const q = query(collection(db, collectionName), where(statusField, '==', 'draft'));
        const snap = await getDocs(q);
        setCount(snap.size);
      } catch (err) {
        console.error(`Error fetching draft count for ${collectionName}:`, err);
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [collectionName, statusField]);

  if (count === 0) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full text-[10px] font-semibold">
      {count}
    </span>
  );
}

// --- Sidebar Section ---
function SidebarSection({
  title,
  children,
  defaultOpen = false,
  icon: Icon,
  isCollapsed,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: LucideIcon;
  isCollapsed: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 bg-transparent text-[#a0a0a0] text-[13px] cursor-pointer rounded hover:bg-white/5 hover:text-[#e0e0e0] transition-all whitespace-nowrap`}
      >
        <span className="flex items-center gap-2.5">
          {Icon && <Icon size={14} />}
          {!isCollapsed && <span>{title}</span>}
        </span>
        {!isCollapsed && (isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </button>
      {isOpen && !isCollapsed && <div className="py-0.5">{children}</div>}
    </div>
  );
}

// --- Nav Item ---
function NavItem({
  href,
  icon: Icon,
  children,
  isCollapsed,
  isActive,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  isCollapsed: boolean;
  isActive: boolean;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} gap-2.5 py-2 mx-2 my-0.5 rounded text-[13px] transition-all whitespace-nowrap no-underline ${
        isActive
          ? 'text-[#40e0d0] bg-[rgba(64,224,208,0.1)]'
          : 'text-[#a0a0a0] hover:bg-white/5 hover:text-[#e0e0e0]'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#40e0d0] rounded-r" />
      )}
      <Icon size={14} className={isCollapsed ? '' : 'w-4 text-center'} />
      {!isCollapsed && <span>{children}</span>}
      {!isCollapsed && badge}
    </Link>
  );
}

// --- Menu Components ---
function NewsAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/news" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/news')}>Publish News</NavItem>
      <NavItem href="/admin/edit-news" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-news')}>Edit News</NavItem>
      <NavItem href="/admin/news-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/news-drafts')} badge={<DraftCounter collectionName="news" />}>News Drafts</NavItem>
    </>
  );
}

function NewsDrafterMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/news" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/news')}>Publish News</NavItem>
      <NavItem href="/admin/news-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/news-drafts')} badge={<DraftCounter collectionName="news" />}>News Drafts</NavItem>
    </>
  );
}

function BlogAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/blog" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/blog')}>Publish Blog</NavItem>
      <NavItem href="/admin/edit-blog" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-blog')}>Edit Blog</NavItem>
      <NavItem href="/admin/blog-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/blog-drafts')}>Blog Drafts</NavItem>
    </>
  );
}

function EducationAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/education" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/education')}>Publish Education</NavItem>
      <NavItem href="/admin/edit-education" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-education')}>Edit Education</NavItem>
      <NavItem href="/admin/education-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/education-drafts')}>Education Drafts</NavItem>
    </>
  );
}

function AIModulesAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/ai-modules" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/ai-modules')}>Publish AI Modules</NavItem>
      <NavItem href="/admin/edit-ai-modules" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-ai-modules')}>Edit AI Modules</NavItem>
      <NavItem href="/admin/ai-modules-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/ai-modules-drafts')} badge={<DraftCounter collectionName="ai_modules" />}>AI Module Drafts</NavItem>
    </>
  );
}

function ResearchAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/research" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/research')}>Publish Research</NavItem>
      <NavItem href="/admin/edit-research" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-research')}>Edit Research</NavItem>
      <NavItem href="/admin/research-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/research-drafts')} badge={<DraftCounter collectionName="research_articles" />}>Research Drafts</NavItem>
    </>
  );
}

function GamesAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/games" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/games')}>Publish Games</NavItem>
      <NavItem href="/admin/edit-games" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-games')}>Edit Games</NavItem>
      <NavItem href="/admin/games-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/games-drafts')} badge={<DraftCounter collectionName="games" />}>Game Drafts</NavItem>
    </>
  );
}

function MarketAnalysisAdminMenu({ isCollapsed, checkActive }: { isCollapsed: boolean; checkActive: (p: string) => boolean }) {
  return (
    <>
      <NavItem href="/admin/market-analysis" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/market-analysis')}>Publish Market Analysis</NavItem>
      <NavItem href="/admin/edit-market-analysis" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-market-analysis')}>Edit Market Analysis</NavItem>
    </>
  );
}

// --- Main Layout ---
export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isSuperAdmin = userData?.role === 'superadmin';
  const isAdmin = userData?.role === 'admin';
  const isNewsResearchAdmin = userData?.role === 'newsresearchadmin';
  const isNewsDrafter = userData?.role === 'newsdrafter';
  const isGamesAdmin = userData?.role === 'gamesadmin';
  const isMarketAnalysisAdmin = userData?.role === 'marketanalysisadmin';

  const getRoleDisplayName = useCallback(() => {
    switch (userData?.role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'newsresearchadmin': return 'News & Research Admin';
      case 'newsdrafter': return 'News Drafter';
      case 'gamesadmin': return 'Games Admin';
      case 'marketanalysisadmin': return 'Market Analysis Admin';
      default: return 'User';
    }
  }, [userData?.role]);

  const checkActive = useCallback((path: string) => pathname.startsWith(path), [pathname]);

  const sidebarWidth = isCollapsed ? 60 : 260;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <div
        className="fixed top-0 left-0 bottom-0 overflow-y-auto overflow-x-hidden border-r border-white/5 flex flex-col z-[1000]"
        style={{
          width: `${sidebarWidth}px`,
          background: '#1a1a1a',
          transition: 'width 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/5">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-transparent border-none text-[#e0e0e0] cursor-pointer p-2 flex items-center justify-center rounded hover:bg-white/10 hover:text-[#40e0d0] transition-all"
          >
            <Menu size={20} />
          </button>
          {!isCollapsed && (
            <span className="ml-3 text-lg font-semibold text-[#40e0d0]">Kumami</span>
          )}
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-white/5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(64,224,208,0.1)] text-[#40e0d0] rounded-full text-xs font-medium border border-[rgba(64,224,208,0.2)]">
              <ShieldCheck size={12} />
              <span>{getRoleDisplayName()}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col py-2 flex-1">
          {(isSuperAdmin || isAdmin) && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[#606060] font-semibold">
                  Content
                </div>
              )}

              <SidebarSection title="News" icon={Newspaper} defaultOpen={checkActive('/admin/news')} isCollapsed={isCollapsed}>
                <NewsAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="Blog" icon={BookOpen} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/blog')}>
                <BlogAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="Education" icon={GraduationCap} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/education')}>
                <EducationAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="AI Modules" icon={Cpu} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/ai-modules')}>
                <AIModulesAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="Research" icon={FileText} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/research')}>
                <ResearchAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="Games" icon={Gamepad2} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/games')}>
                <GamesAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              <SidebarSection title="Market Analysis" icon={TrendingUp} isCollapsed={isCollapsed} defaultOpen={checkActive('/admin/market-analysis')}>
                <MarketAnalysisAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>

              {!isCollapsed && (
                <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[#606060] font-semibold">
                  Management
                </div>
              )}

              <SidebarSection title="Partners" icon={Users} isCollapsed={isCollapsed}>
                <NavItem href="/admin/homepage-partners" icon={Home} isCollapsed={isCollapsed} isActive={checkActive('/admin/homepage-partners')}>Homepage Partners</NavItem>
                <NavItem href="/admin/all-partners" icon={Building} isCollapsed={isCollapsed} isActive={checkActive('/admin/all-partners')}>All Partners</NavItem>
                <NavItem href="/admin/partner-articles" icon={PlusCircle} isCollapsed={isCollapsed} isActive={checkActive('/admin/partner-articles')}>Publish Partner Articles</NavItem>
                <NavItem href="/admin/edit-partner-articles" icon={Edit} isCollapsed={isCollapsed} isActive={checkActive('/admin/edit-partner-articles')}>Edit Partner Articles</NavItem>
                <NavItem href="/admin/partner-drafts" icon={FileText} isCollapsed={isCollapsed} isActive={checkActive('/admin/partner-drafts')}>Partner Drafts</NavItem>
              </SidebarSection>

              <SidebarSection title="Community" icon={MessageCircle} isCollapsed={isCollapsed}>
                <NavItem href="/admin/notifications" icon={Bell} isCollapsed={isCollapsed} isActive={checkActive('/admin/notifications')}>Notifications</NavItem>
                <NavItem href="/admin/alpha-room" icon={MessageSquare} isCollapsed={isCollapsed} isActive={checkActive('/admin/alpha-room')}>Alpha Room</NavItem>
              </SidebarSection>

              <SidebarSection title="Media" icon={Video} defaultOpen isCollapsed={isCollapsed}>
                <NavItem href="/admin/manage-shorts" icon={Play} isCollapsed={isCollapsed} isActive={checkActive('/admin/manage-shorts')}>YouTube Shorts</NavItem>
              </SidebarSection>
            </>
          )}

          {isNewsResearchAdmin && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[#606060] font-semibold">
                  Content
                </div>
              )}
              <SidebarSection title="News" icon={Newspaper} defaultOpen isCollapsed={isCollapsed}>
                <NewsAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>
              <SidebarSection title="Blog" icon={BookOpen} isCollapsed={isCollapsed}>
                <BlogAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>
              <SidebarSection title="Education" icon={GraduationCap} isCollapsed={isCollapsed}>
                <EducationAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>
              <SidebarSection title="AI Modules" icon={Cpu} isCollapsed={isCollapsed}>
                <AIModulesAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>
              <SidebarSection title="Research" icon={FileText} isCollapsed={isCollapsed}>
                <ResearchAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
              </SidebarSection>
            </>
          )}

          {isGamesAdmin && (
            <SidebarSection title="Games" icon={Gamepad2} defaultOpen isCollapsed={isCollapsed}>
              <GamesAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
            </SidebarSection>
          )}

          {isMarketAnalysisAdmin && (
            <SidebarSection title="Market Analysis" icon={TrendingUp} defaultOpen isCollapsed={isCollapsed}>
              <MarketAnalysisAdminMenu isCollapsed={isCollapsed} checkActive={checkActive} />
            </SidebarSection>
          )}

          {isNewsDrafter && (
            <SidebarSection title="News" icon={Newspaper} defaultOpen isCollapsed={isCollapsed}>
              <NewsDrafterMenu isCollapsed={isCollapsed} checkActive={checkActive} />
            </SidebarSection>
          )}

          {isSuperAdmin && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[#606060] font-semibold">
                  Administration
                </div>
              )}
              <NavItem href="/admin/roadmap" icon={Map} isCollapsed={isCollapsed} isActive={checkActive('/admin/roadmap')}>
                Roadmap
              </NavItem>
              <NavItem href="/admin/role-management" icon={UserCog} isCollapsed={isCollapsed} isActive={checkActive('/admin/role-management')}>
                Role Management
              </NavItem>
            </>
          )}
        </nav>
      </div>

      {/* Content Area */}
      <div
        className="flex-1 bg-white min-h-screen h-screen overflow-y-auto"
        style={{
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
