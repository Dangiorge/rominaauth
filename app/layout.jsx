// path: app/layout.jsx

import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Romina PLC",
  description: "Romina PLC internal system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
