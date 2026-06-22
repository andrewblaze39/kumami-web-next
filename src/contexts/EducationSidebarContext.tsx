'use client'

import { createContext, useContext, useState } from 'react'

interface EducationSidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const EducationSidebarContext = createContext<EducationSidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
})

export function EducationSidebarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = () => setIsOpen(o => !o)
  const close = () => setIsOpen(false)
  return (
    <EducationSidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </EducationSidebarContext.Provider>
  )
}

export function useEducationSidebar() {
  return useContext(EducationSidebarContext)
}
