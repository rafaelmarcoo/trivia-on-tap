import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InGameNotificationProvider from "@/components/notifications/InGameNotificationProvider";
import NotificationOverlay from "@/components/notifications/NotificationOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Trivia on Tap",
  description: "Test your knowledge and have fun!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <InGameNotificationProvider>
          {children}
          <NotificationOverlay />
        </InGameNotificationProvider>
      </body>
    </html>
  );
}
