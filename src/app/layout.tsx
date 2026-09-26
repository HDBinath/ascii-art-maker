import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
      <body>
        <ClerkProvider
          appearance={{
            theme: dark,
            variables: {
              colorBackground: "#161616",
              colorPrimary: "#fd86db",
              colorForeground: "#ffffff",
              colorMutedForeground: "#a1a1aa",
              colorInput: "#222222",
              colorInputForeground: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-geist-sans), sans-serif",
            },
            elements: {
              card: "bg-[#161616] border border-white/10 shadow-2xl backdrop-blur-xl",
              modalContent: "bg-[#161616] border border-white/10 shadow-2xl",
              modalBackdrop: "bg-black/80 backdrop-blur-sm",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-neutral-400",
              formButtonPrimary:
                "bg-[#fd86db] hover:bg-[#ff9de5] text-black font-semibold shadow-[0_0_20px_rgba(253,134,219,0.3)] hover:shadow-[0_0_25px_rgba(253,134,219,0.5)] transition-all",
              formFieldInput:
                "bg-[#222222] border-white/10 text-white focus:border-[#fd86db] focus:ring-1 focus:ring-[#fd86db]",
              footerActionLink: "text-[#fd86db] hover:text-[#ff9de5]",
              socialButtonsBlockButton:
                "border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-neutral-500",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}