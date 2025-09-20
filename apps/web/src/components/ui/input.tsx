import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#8f47ff] focus:outline-none focus:ring-2 focus:ring-[#8f47ff]/60",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
