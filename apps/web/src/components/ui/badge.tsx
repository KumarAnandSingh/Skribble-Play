import * as React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning";
}

const variantMap = {
  default: "bg-white/10 text-white",
  outline: "border border-white/20 text-white",
  success: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-200"
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variantMap[variant],
        className
      )}
      {...props}
    />
  );
}
