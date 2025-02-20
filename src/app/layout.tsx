import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import ClientRoutingHandler from './components/ClientRoutingHandler'
import Providers from './components/Providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Huzzar | Vectra CRM',
  description: 'System zarządzania dla Vectry Huzzar',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <ClientRoutingHandler>{children}</ClientRoutingHandler>
        </Providers>
      </body>
    </html>
  )
}
