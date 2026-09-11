import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPulse Enterprise | Multi-Tenant B2B CRM & Lead Generation SaaS",
  description: "Enterprise Multi-Tenant CRM, Lead Generation, Pipeline Deals, RBAC, and Commercials Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
