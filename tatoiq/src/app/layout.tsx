import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://web-app---tato.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TatoIQ — Tax preparation & client portal",
    template: "%s · TatoIQ",
  },
  description:
    "TatoIQ is a tax preparation, accounting, and client portal for individuals, self-employed professionals, and small-business owners, with the Saggio AI assistant.",
  applicationName: "TatoIQ",
  keywords: [
    "tax preparation",
    "client portal",
    "tax software",
    "self-employed taxes",
    "Schedule C",
    "tax document upload",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "TatoIQ",
    title: "TatoIQ — Tax preparation & client portal",
    description:
      "Guided intake, document capture with confirmation, and live status tracking — with an AI assistant that shows its IRS sources.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TatoIQ — Tax preparation & client portal",
    description:
      "Guided intake, document capture with confirmation, and live status tracking — with an AI assistant that shows its IRS sources.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081627",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-navy-900">
        {children}
      </body>
    </html>
  );
}
