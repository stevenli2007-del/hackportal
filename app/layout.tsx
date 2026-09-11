import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "HackPortal — Cal Hacks",
  description: "A miniature hackathon application portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Self-hiding: renders only when a session exists (see site-header). */}
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
