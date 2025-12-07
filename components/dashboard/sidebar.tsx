"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  FileCheck,
  Truck,
  Package,
  Receipt,
  LogOut,
  Settings
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserRole, CompanyType } from "@prisma/client";

interface SidebarProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
    companyId: string;
    companyType: CompanyType;
  };
  company: {
    id: string;
    name: string;
  } | null;
}

// Buyer navigation menu
const buyerNavigation = [
  {
    name: "Dashboard",
    href: "/buyer",
    icon: LayoutDashboard,
  },
  {
    name: "Company Profile",
    href: "/company/profile",
    icon: Building2,
  },
  {
    name: "Seller Management",
    href: "/buyer/sellers",
    icon: Users,
  },
  {
    name: "RFQs",
    href: "/buyer/rfqs",
    icon: FileText,
  },
  {
    name: "Quotations (Received)",
    href: "/buyer/quotations",
    icon: ClipboardList,
  },
  {
    name: "Contracts (Received)",
    href: "/buyer/contracts",
    icon: FileCheck,
  },
  {
    name: "Purchase Orders",
    href: "/buyer/purchase-orders",
    icon: FileText,
  },
  {
    name: "Delivery Notes (Received)",
    href: "/buyer/delivery-notes",
    icon: FileText,
  },
  {
    name: "Packing Lists (Received)",
    href: "/buyer/packing-lists",
    icon: Package,
  },
  {
    name: "Invoices (Received)",
    href: "/buyer/invoices",
    icon: Receipt,
  },
];

// Seller navigation menu
const sellerNavigation = [
  {
    name: "Dashboard",
    href: "/seller",
    icon: LayoutDashboard,
  },
  {
    name: "Company Profile",
    href: "/company/profile",
    icon: Building2,
  },
  {
    name: "Buyer Management",
    href: "/seller/buyers",
    icon: Users,
  },
  {
    name: "RFQs (Received)",
    href: "/seller/rfqs",
    icon: FileText,
  },
  {
    name: "Quotations",
    href: "/seller/quotations",
    icon: ClipboardList,
  },
  {
    name: "Contracts",
    href: "/seller/contracts",
    icon: FileCheck,
  },
  {
    name: "Purchase Orders (Received)",
    href: "/seller/purchase-orders",
    icon: FileText,
  },
  {
    name: "Sales Orders",
    href: "/seller/sales-orders",
    icon: FileText,
  },
  {
    name: "Delivery Notes",
    href: "/seller/delivery-notes",
    icon: FileText,
  },
  {
    name: "Packing Lists",
    href: "/seller/packing-lists",
    icon: Package,
  },
  {
    name: "Invoices",
    href: "/seller/invoices",
    icon: Receipt,
  },
];

export function Sidebar({ user, company }: SidebarProps) {
  const pathname = usePathname();
  
  // Select navigation based on company type
  const navigation = user.companyType === CompanyType.BUYER 
    ? buyerNavigation 
    : sellerNavigation;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 space-y-4">
        {/* User and Company Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.name || user.email}
              </p>
              {company && (
                <p className="text-xs text-muted-foreground truncate">
                  {company.name}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Sign Out Button */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
