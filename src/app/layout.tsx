import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYBER::STUDIO — Neural ASCII & Dithered Pixel Art Generator",
  description: "Next-gen interactive ASCII art and retro dithered pixel art studio. Real-time Floyd-Steinberg, Atkinson, Bayer crosshatch dithering, CRT shaders, and instant exports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
