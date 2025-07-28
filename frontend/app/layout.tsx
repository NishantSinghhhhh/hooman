// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/theme-provider";
import { SessionProvider } from "../context/session-provider";
import { ClientOnlyRecordingFAB } from "@/components/AudioVideo/ClientOnlyRecordingFAB";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multimodal AI Assistant",
  description: "AI-powered multimodal assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            {/* Global Recording FAB - Available on all pages */}
            <ClientOnlyRecordingFAB />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}