import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

export type ButtonVariant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, className = "", ...rest }, ref) => {
    const baseStyles = {
      padding: "0.65rem 1.5rem",
      borderRadius: "999px",
      border: variant === "ghost" ? "1px solid rgba(255, 255, 255, 0.35)" : "none",
      background:
        variant === "primary" ? "linear-gradient(135deg, #8f47ff, #ff6fcb)" : "rgba(255, 255, 255, 0.05)",
      color: "#fdfdff",
      fontWeight: 600,
      cursor: "pointer",
      transition: "transform 120ms ease, opacity 120ms ease"
    } as const;

    return (
      <button
        ref={ref}
        data-variant={variant}
        className={className}
        style={baseStyles}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export const uiKitVersion = "0.1.0";
