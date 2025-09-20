"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  return <DialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogTrigger must be used within Dialog");
  const child = asChild ? children : React.cloneElement(React.Children.only(children), {});
  return React.cloneElement(child, {
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event);
      ctx.setOpen(true);
    }
  });
}

export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(DialogContext);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!ctx || !ctx.open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className={cn("w-full max-w-lg rounded-3xl bg-[rgba(20,20,40,0.95)] p-6 text-white shadow-panel", className)}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-white/70", className)} {...props} />;
}

export function DialogClose({ children }: { children: React.ReactElement }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogClose must be used within Dialog");
  return React.cloneElement(React.Children.only(children), {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      ctx.setOpen(false);
    }
  });
}
