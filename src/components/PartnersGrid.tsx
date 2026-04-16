'use client'

import { useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Partner {
  id: string
  name?: string
  logoUrl?: string
  link?: string
}

interface PartnerDisplay {
  key: string
  src?: string
  alt: string
  link: string
  hasLogo: boolean
}

export default function PartnersGrid() {
  const [partners, setPartners] = useState<PartnerDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const q = query(collection(db, 'all_partners'))
        const snapshot = await getDocs(q)
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Partner, 'id'>),
        }))

        const mapped: PartnerDisplay[] = list
          .filter((p) => p.logoUrl || p.name)
          .map((p) => ({
            key: p.id,
            src: p.logoUrl,
            alt: p.name || 'Partner',
            link: p.link || '#',
            hasLogo: !!p.logoUrl,
          }))

        setPartners(mapped)
      } catch (err: unknown) {
        console.error('Error loading partners from Firestore:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPartners()
  }, [])

  const sorted = partners.slice().sort((a, b) => a.alt.localeCompare(b.alt))

  return (
    <section
      className="py-12 text-white"
      id="partners"
      style={{
        background:
          'linear-gradient(175deg, #4E8177 0%, #102425 10%, #102425 70%, #1C4345 85%, #1D5959 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          All Partners
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-[#40e0d0]" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-y-5 gap-x-1 justify-items-center pl-3 md:pl-5">
            {sorted.map((partner) => (
              <div key={partner.key} className="flex items-center justify-center">
                <a
                  href={partner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {partner.hasLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={partner.src}
                      alt={partner.alt}
                      className="max-w-[75%] h-auto mx-auto"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className="items-center justify-center h-[72px] text-white/60 text-sm font-semibold text-center px-2"
                    style={{ display: partner.hasLogo ? 'none' : 'flex' }}
                  >
                    {partner.alt}
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
