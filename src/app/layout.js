// src/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from './context/AuthContext'; // Import the provider

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Calories Counter",
  description: "Track your calories with Firebase Auth",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthContextProvider> {/* Wrap your app */}
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}