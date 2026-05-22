import type { Metadata } from 'next'
import { DM_Serif_Display, Inter, DM_Mono } from 'next/font/google'
import './globals.css'

const display = DM_Serif_Display({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

const mono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Asiryx — Habit Tracker',
  description: 'Small actions. Big results. Track your daily and weekly habits.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} dark`}>
      <body className="bg-bg text-white font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
