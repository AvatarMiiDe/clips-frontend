import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { EmbeddedWalletProvider } from "@/components/EmbeddedWalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClipCash - AI Clipping V2.0",
  description: "Turn 1 long video into 100+ viral clips. Preview, pick, post & mint.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="radial-bg" />
        <AuthProvider>
          {/* EmbeddedWalletProvider is nested inside AuthProvider so it can
              receive the userId from auth context via the AuthProvider's
              child components. The userId prop is optional here — individual
              pages/components call initWallet(userId) directly after signup. */}
          <EmbeddedWalletProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </EmbeddedWalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
