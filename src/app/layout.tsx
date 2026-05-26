import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CREARD - Gestión de Canchas Deportivas",
  description: "La plataforma #1 para reservar y gestionar canchas deportivas. Fútbol, vóley y eventos. Reserva en línea, paga seguro y disfruta.",
  keywords: ["canchas", "reservas deportivas", "fútbol", "vóley", "básquet", "tenis", "gestión deportiva"],
  icons: {
    icon: "/creard-logo.png",
  },
  openGraph: {
    title: "CREARD",
    description: "La plataforma #1 para reservar canchas deportivas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${sora.variable} ${inter.variable} antialiased`}
      >
        <SiteSettingsProvider>
          {children}
        </SiteSettingsProvider>
        <Toaster />
      </body>
    </html>
  );
}
