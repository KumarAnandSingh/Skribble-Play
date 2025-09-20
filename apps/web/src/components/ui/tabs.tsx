"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      setInternalValue(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex rounded-2xl bg-white/5 p-1", className)} role="tablist">
      {children}
    </div>
  );
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside Tabs");
  const isActive = ctx.value === value;
  return (
    <button
      type="button"
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition",
        isActive ? "bg-gradient-to-r from-[#8f47ff] to-[#ff6fcb] text-white shadow" : "text-white/70 hover:text-white"
      , className)}
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setValue(value)}
      {...props}
    >
      {children}
    </button>
  );
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: ContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside Tabs");
  const hidden = ctx.value !== value;
  return (
    <div
      role="tabpanel"
      hidden={hidden}
      className={cn(hidden ? "pointer-events-none h-0 overflow-hidden" : "mt-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
