import type { Metadata } from 'next'
import { Anton, Archivo, Space_Mono } from 'next/font/google'
import './globals.css'

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const archivo = Archivo({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pacheco Watersports · Jet Ski Rentals & Skid Steer Services · Conchas Lake, NM',
  description:
    'High-performance jet ski rentals and professional skid steer services at Conchas Lake, New Mexico. One local crew. On the water, on the job.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
