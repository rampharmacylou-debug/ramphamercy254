import Link from "next/link";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-hairline bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <span className="font-display font-semibold text-lg tracking-tight text-ink">
              Ram Pharmacy
            </span>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link
                href="/staff/products"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Products
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

