import { Plus_Jakarta_Sans } from 'next/font/google'
import EducationSidebar from '@/components/education/EducationSidebar'
import EducationTopbar from '@/components/education/EducationTopbar'
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
    <div className={`edu-app ${jakarta.variable}`}>
      <EducationSidebar />
      <main className="edu-main">
        <EducationTopbar />
        {children}
      </main>
    </div>
  )
}
