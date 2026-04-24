import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lumm-dark text-lumm-text-primary">
      <header className="sticky top-0 z-10 bg-lumm-dark/80 backdrop-blur-sm border-b border-lumm-gray-light/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-lumm-gold tracking-wider">
            LUMM
          </Link>
          <Link
            href="/login"
            className="text-sm text-lumm-text-secondary hover:text-lumm-gold transition-colors"
          >
            Войти
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-lumm-gray-light/30 mt-24">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-lumm-text-secondary">
          <span>LUMM · Level Up Mastermind · {new Date().getFullYear()}</span>
          <Link href="/login" className="hover:text-lumm-gold transition-colors">
            Войти
          </Link>
        </div>
      </footer>
    </div>
  );
}
