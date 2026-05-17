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
  title: 'Kumami World — Where Web3 Finally Makes Sense',
  description: 'Where Web3 finally makes sense. Kumami World is your all-in-one platform for crypto intelligence, Web3 education, gaming, and community.',
  openGraph: {
    title: 'Kumami World — Where Web3 Finally Makes Sense',
    description: 'Where Web3 finally makes sense. Kumami World is your all-in-one platform for crypto intelligence, Web3 education, gaming, and community.',
    url: 'https://kumami.world',
    siteName: 'Kumami World',
    images: [
      {
        url: '/logo kumami final.png',
        width: 1200,
        height: 630,
        alt: 'Kumami World',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kumami World — Where Web3 Finally Makes Sense',
    description: 'Where Web3 finally makes sense.',
    images: ['/logo kumami final.png'],
  },
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
            <div className="pt-[118px]">
              {children}
            </div>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
