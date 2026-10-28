import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ScholarPath — твой учебный путь",
    template: "%s · ScholarPath",
  },
  description: "Предметы, кредиты и успеваемость в одном учебном пространстве.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
