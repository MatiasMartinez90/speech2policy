import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { configureAmplify } from "@/lib/amplify-config";

const inter = Inter({ subsets: ["latin"] });

// Configure Amplify on app load
configureAmplify();

export const metadata: Metadata = {
  title: "Speech2Policy - AI-Powered IAM Policy Generator",
  description: "Convert natural language to AWS IAM policies using Claude 3.5 Sonnet",
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
