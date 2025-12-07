"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, setIsOpen]);

  return (
    <PopoverContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ asChild, children, className }: PopoverTriggerProps) {
  const { setOpen, open } = React.useContext(PopoverContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      className: cn(className, children.props.className),
    } as any);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

export function PopoverContent({
  align = "start",
  side = "bottom",
  className,
  children,
  ...props
}: PopoverContentProps) {
  const { open, setOpen } = React.useContext(PopoverContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open && contentRef.current) {
      // Find the trigger element
      const container = contentRef.current.closest(".relative");
      if (container) {
        triggerRef.current = container.querySelector("button, [role='button']") as HTMLElement;
      }
    }
  }, [open]);

  React.useEffect(() => {
    if (open && contentRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const content = contentRef.current;
      
      // Reset positioning
      content.style.position = "fixed";
      content.style.zIndex = "50";

      if (side === "bottom") {
        content.style.top = `${triggerRect.bottom + 8}px`;
      } else if (side === "top") {
        content.style.bottom = `${window.innerHeight - triggerRect.top + 8}px`;
      }

      if (align === "start") {
        content.style.left = `${triggerRect.left}px`;
      } else if (align === "end") {
        content.style.right = `${window.innerWidth - triggerRect.right}px`;
      } else {
        content.style.left = `${triggerRect.left + triggerRect.width / 2 - content.offsetWidth / 2}px`;
      }
    }
  }, [open, align, side]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
      />
      <div
        ref={contentRef}
        className={cn(
          "bg-popover text-popover-foreground rounded-md border shadow-md p-1",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

