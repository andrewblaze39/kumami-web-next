import { Plus_Jakarta_Sans } from 'next/font/google'
import EducationSidebar from '@/components/education/EducationSidebar'
import { EducationSidebarProvider } from '@/contexts/EducationSidebarContext'
import './education.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export default function EducationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EducationSidebarProvider>
      <div className={`edu-app ${jakarta.variable}`}>
        <EducationSidebar />
        <main className="edu-main">
          {children}
        </main>
      </div>
    </EducationSidebarProvider>
  )
}
