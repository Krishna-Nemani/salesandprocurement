import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  className?: string;
}

export function DropdownMenu({ children, trigger, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, right: 0 });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (open) {
        // Check if click is outside both the trigger and the dropdown
        const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
        const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
        
        if (isOutsideTrigger && isOutsideDropdown) {
          setOpen(false);
        }
      }
    };

    if (open) {
      // Use click instead of mousedown to allow menu item clicks to fire first
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside, true);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [open]);

  // Calculate position for fixed dropdown
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        
        const trigger = triggerRef.current;
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Estimate dropdown dimensions (2 menu items + padding)
        const estimatedHeight = 80; // Approximate height for 2 items
        const estimatedWidth = 128; // min-w-[8rem] = 128px
        
        // Calculate position - align to bottom-right of trigger
        let top = rect.bottom + 8; // 8px = mt-2 equivalent
        let right = viewportWidth - rect.right;

        // Adjust if going off bottom - show above instead
        if (top + estimatedHeight > viewportHeight - 8) {
          top = rect.top - estimatedHeight - 8;
          if (top < 8) top = 8; // Fallback to top of viewport with padding
        }

        // Adjust if going off right - align to left edge of trigger
        if (right < 0 || right + estimatedWidth > viewportWidth) {
          right = viewportWidth - rect.left;
        }

        setPosition({ top, right });
      };

      // Update position immediately and after a small delay to account for rendering
      updatePosition();
      const timeoutId = setTimeout(updatePosition, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  return (
    <>
      <div className="relative" data-dropdown ref={containerRef}>
        <div 
          ref={triggerRef} 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {trigger}
        </div>
      </div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              // Only close if clicking directly on the overlay, not on the dropdown
              if (e.target === e.currentTarget) {
                setOpen(false);
              }
            }}
          />
          <div
            ref={dropdownRef}
            className={cn(
              "fixed z-50 min-w-[8rem] overflow-visible rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              className
            )}
            style={{
              top: `${position.top}px`,
              right: `${position.right}px`,
            }}
            onMouseDown={(e) => {
              // Prevent the click outside handler from firing
              e.stopPropagation();
            }}
            onClick={(e) => {
              // Don't close when clicking inside the dropdown
              e.stopPropagation();
            }}
          >
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child) && child.type === DropdownMenuItem) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  onSelect: () => {
                    setOpen(false);
                  },
                });
              }
              return child;
            })}
          </div>
        </>
      )}
    </>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  onSelect,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  onSelect?: () => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Call onClick first
    if (onClick) {
      onClick(e);
    }
    // Then call onSelect if provided (for closing dropdown)
    // Use setTimeout to ensure onClick executes first
    if (onSelect) {
      setTimeout(() => {
        onSelect();
      }, 10);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

