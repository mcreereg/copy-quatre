import type { CSSProperties, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  style?: CSSProperties;
};

export function Button({ children, onClick, variant = "primary", style }: ButtonProps) {
  const className = variant === "primary" ? "btn btn-primary" : "btn btn-secondary";
  return (
    <button type="button" className={className} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
