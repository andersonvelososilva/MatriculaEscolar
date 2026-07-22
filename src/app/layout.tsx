import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineBanner from "./OfflineBanner";

export const metadata: Metadata = {
  title: "Reserva de Matrícula Escolar PWA",
  description: "Faça e acompanhe reservas de matrículas de forma simples e rápida com suporte offline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Matrícula Escolar",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a73e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}

