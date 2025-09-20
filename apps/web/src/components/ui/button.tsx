import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-[#8f47ff] to-[#ff6fcb] text-white shadow-lg hover:brightness-110",
  ghost: "bg-white/5 text-white hover:bg-white/10",
  outline: "border border-white/20 bg-transparent text-white hover:bg-white/5",
  danger: "bg-rose-600 text-white hover:bg-rose-500"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : null}
        <span className={cn(isLoading ? "opacity-70" : undefined)}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
