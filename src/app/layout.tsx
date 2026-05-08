import './globals.css'
import '../styles/globals.css'
import '../styles/App.css'
import '../styles/cryptoticker.css'
import { Lato } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import Navbar from '@/components/Navbar'
import CryptoTicker from '@/components/CryptoTicker'

const lato = Lato({ subsets: ['latin'], weight: ['300', '400', '700', '900'] })

export const metadata = {
  title: 'Kumami World — Innovation Redefined',
  description: 'Kumami World is a Web3 ecosystem combining crypto intelligence, education, and community.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${lato.className} dark-main`}>
        <AuthProvider>
          <NotificationProvider>
            <Navbar />
            <CryptoTicker />
            <div className="pt-[112px]">
              {children}
            </div>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
