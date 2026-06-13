import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareOS",
  description: "Trusted family care platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F8FBFF] text-slate-900">{children}</body>
    </html>
  );
}
