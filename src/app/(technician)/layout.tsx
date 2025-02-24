import ClientRoutingHandler from '@/app/components/ClientRoutingHandler'
import Providers from '@/app/components/Providers'
import '@/app/globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Huzzar | Vectra CRM - Technician',
  description: 'Technician panel for Huzzar Vectra CRM',
}

/**
 * Technician layout sharing the same Providers and ClientRoutingHandler.
 */
export default function TechnicianLayout({
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
