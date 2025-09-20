import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Skribble Play",
  description: "Fast-paced multiplayer drawing battles with voice chat and moderation tools."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[color:var(--color-background)] text-[color:var(--color-text)]">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
