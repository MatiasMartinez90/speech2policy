import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { configureAmplify } from "@/lib/amplify-config";

const inter = Inter({ subsets: ["latin"] });

// Configure Amplify on app load
configureAmplify();

export const metadata: Metadata = {
  title: "IAM Copilot - AI-Powered IAM Management",
  description: "Analyze, optimize, and secure your AWS IAM policies with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
