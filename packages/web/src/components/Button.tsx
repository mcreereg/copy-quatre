import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  style?: CSSProperties;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">;

export function Button({
  children,
  onClick,
  variant = "primary",
  style,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const className = variant === "primary" ? "btn btn-primary" : "btn btn-secondary";
  return (
    <button type="button" className={className} onClick={onClick} style={style} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
