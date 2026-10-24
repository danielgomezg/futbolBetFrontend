import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Chile Futbol - Predicciones",
  description: "Predicciones y seguimiento de apuestas, liga chilena",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthGate>
          <NavBar />
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
