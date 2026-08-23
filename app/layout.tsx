import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NER-LOGIX AI · Command Center',
  description: 'AI-powered smart logistics and accessibility intelligence platform for the North Eastern Region of India.',
  generator: 'v0.app',
}

export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#091116', userScalable: false }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
