import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curyloop Community",
  description: "Self-hosted knowledge management and team bookmark curation platform",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
