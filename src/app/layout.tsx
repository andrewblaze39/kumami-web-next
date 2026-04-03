import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import '../styles/globals.css'
import '../styles/App.css'
import '../styles/cryptoticker.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import Navbar from '@/components/Navbar'
import CryptoTicker from '@/components/CryptoTicker'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} dark-main`}>
        <AuthProvider>
          <NotificationProvider>
            <Navbar />
            <CryptoTicker />
            <div className="pt-[127px]">
              {children}
            </div>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
