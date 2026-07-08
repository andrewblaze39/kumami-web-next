'use client'

/**
 * EduEmbed — wrapper that lets Andrew's original education pages render inside
 * the world shell's main view. Applies the `.edu-app` scoping class (so
 * education.css rules apply) plus the Jakarta font variable, WITHOUT the old
 * EducationSidebar/EducationTopbar chrome. Layout resets (flex/min-height/
 * background) live in world.css under `.edu-embed`.
 */

import { Plus_Jakarta_Sans } from 'next/font/google'
import '@/app/education/education.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export default function EduEmbed({ children }: { children: React.ReactNode }) {
  return (
    <div className={`edu-app edu-embed ${jakarta.variable}`}>
      <main className="edu-main">{children}</main>
    </div>
  )
}
