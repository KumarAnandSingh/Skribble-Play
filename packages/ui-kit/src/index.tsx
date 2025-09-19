import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  return (
    <button
      data-variant={variant}
      style={{
        padding: "0.625rem 1.5rem",
        borderRadius: "999px",
        border: variant === "ghost" ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
        background:
          variant === "primary" ? "linear-gradient(135deg, #8f47ff, #ff6fcb)" : "transparent",
        color: variant === "primary" ? "#fefefe" : "#c6c6d8",
        fontWeight: 600,
        cursor: "pointer",
        transition: "transform 120ms ease, opacity 120ms ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
