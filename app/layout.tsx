import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from "@/lib/sidebar-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Fruit Eazy ERP",
  description: "Fruit Eazy ERP — Pure Fruit. Made Eazy. Enterprise Resource Planning System",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ProtectedRoute>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </ProtectedRoute>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
