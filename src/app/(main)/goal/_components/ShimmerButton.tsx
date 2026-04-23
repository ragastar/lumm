import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function ShimmerButton({ href, children, variant = "primary" }: Props) {
  if (variant === "secondary") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-lumm-gold/40 text-lumm-gold hover:bg-lumm-gold/10 transition-colors font-medium"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="btn-shimmer inline-flex items-center gap-2 px-7 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
    >
      {children}
    </Link>
  );
}
