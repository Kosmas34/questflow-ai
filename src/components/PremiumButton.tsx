// Thin wrapper standardizing the primary/secondary/ghost button styles.
// Renders an <a> when href is provided, otherwise a <button>.
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-sea/70 transition-colors hover:bg-sand hover:text-sea",
};

export default function PremiumButton({
  children,
  href,
  onClick,
  variant = "primary",
  icon: Icon,
  className = "",
  type = "button",
  disabled,
  download,
  target,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  download?: boolean;
  target?: string;
}) {
  const cls = `${VARIANTS[variant]} ${className}`;
  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </>
  );
  if (href) {
    // External/route link. `download` and `target` only apply to <a>.
    if (download || target || href.startsWith("/api") || href.startsWith("http")) {
      return (
        <a href={href} className={cls} download={download} target={target} rel={target ? "noreferrer" : undefined}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
}
