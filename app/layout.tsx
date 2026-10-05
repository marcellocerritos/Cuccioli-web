import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuccioli · Comida y cuidado para tus mascotas",
  description: "Alimento y cuidado para tus mascotas en El Salvador. Pedí por WhatsApp y recibí en casa.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-SV">
      <body className="antialiased">{children}</body>
    </html>
  );
}
