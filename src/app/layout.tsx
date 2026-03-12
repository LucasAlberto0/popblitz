import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerComponent } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "POP BLITZ - Adivinhe rápido. Vença todos.",
  description: "Jogo multiplayer de adivinhação por imagem com cultura pop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-body antialiased">
        <Providers>
          <TooltipProvider>
            {children}
            <Toaster />
            <SonnerComponent />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
