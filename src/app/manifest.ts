import type { MetadataRoute } from 'next';

/** Web app manifest — name, colours and icons for "Add to Home Screen". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kumami World',
    short_name: 'Kumami',
    description: 'Where Web3 finally makes sense — crypto news, Web3 education and market intelligence.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07111a',
    theme_color: '#00c2c7',
    icons: [
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
