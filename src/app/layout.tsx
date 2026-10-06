import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactScan } from "@/components/dev/react-scan";
import { Providers } from "@/components/shell/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Haystack",
  description: "Processing events dashboard, OpenLineage lineage, traces and logs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full overflow-hidden">
        <ReactScan />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
