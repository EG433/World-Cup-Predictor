import type { Metadata } from "next";
import { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup 2026 Friend Predictor",
  description:
    "Starter structure for a private World Cup 2026 prediction game with schedules, team views, and friend pools.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <SiteHeader />
          <main className="page-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
