import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
