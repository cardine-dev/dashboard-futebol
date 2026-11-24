"use client";

import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface AdminButtonProps {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** primary (padrão) para criar; ghost para voltar/secundário */
  variant?: "primary" | "ghost";
}

export default function AdminButton({
  label,
  icon: Icon,
  onClick,
  href,
  className,
  variant = "primary",
}: AdminButtonProps) {
  const baseClasses = `btn ${variant === "ghost" ? "btn-ghost" : "btn-primary"} no-underline cursor-pointer`;

  if (href) {
    return (
      <Link href={href} className={clsx(baseClasses, className)}>
        {Icon && <Icon size={16} />}
        {label}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={clsx(baseClasses, className)}>
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}
