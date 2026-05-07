import type { Metadata } from "next";
import { Inter, Space_Mono, Syncopate } from "next/font/google";
import "./globals.css";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const fontDisplay = Syncopate({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
});

const fontMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Malianteo Ink — Tattoo Artist",
  description: "Prototipo UI (no funcional) para Malianteo / Malianteo_Ink.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontInter.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-zinc-50">
        <div aria-hidden className="purple-storm">
          <span className="purple-storm__flash purple-storm__flash--a" />
          <span className="purple-storm__flash purple-storm__flash--b" />
          <span className="purple-storm__flash purple-storm__flash--c" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
