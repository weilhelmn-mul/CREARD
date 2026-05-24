import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  title: "CanchaMax Pro - Gestión de Canchas Deportivas",
  description: "La plataforma #1 para reservar y gestionar canchas deportivas. Fútbol, vóley, básquet, tenis y más. Reserva en línea, paga seguro y disfruta.",
  keywords: ["canchas", "reservas deportivas", "fútbol", "vóley", "básquet", "tenis", "gestión deportiva"],
  icons: {
    icon: "https://lh3.googleusercontent.com/aida-public/AB6AXuDjVDHNzIdAMhVwEmkn0m6j0jTEHJBBdbEDuemdvXTpV7xyIdcQV5jb3d0pfH0OeqUi5NPAe-82RSxYZ_HnFOusF9icVOg3a5fXN_B7Q4Kq1rg8E8pSIDTNOWr1OiKsrR6So9sOy1Qbv99DDB5mY-TD9ZG7StfdOV9XkEeM5q7GfwkYV_1HoBAAAhAEbjeEnoApczqc8d703zAhJ2L6XYzhoc3iArbCwtemhfcIImmrhx1RtGoxqd7u5iN3xEoUbvxTnXV5aLa-8fjc",
  },
  openGraph: {
    title: "CanchaMax Pro",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
