import "@/app/globals.css";

export const metadata = {
  title: "Pharmacy Price Management",
  description: "Internal pharmacy price tracking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}

