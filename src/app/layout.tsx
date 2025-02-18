import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Header from './components/Header'
import Providers from './components/Providers'
import Sidebar from './components/Sidebar'
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
  title: 'Huzzar CRM',
  description: 'System zarządzania dla Huzzar',
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
          <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex h-screen w-full flex-row items-stretch bg-background text-foreground">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
