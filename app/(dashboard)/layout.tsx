import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/dashboard/topbar";

const Sidebar = dynamic(
  () => import("@/components/dashboard/sidebar").then((mod) => ({ default: mod.Sidebar })),
  {
    ssr: false,
  }
);

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  // Fetch company data for the sidebar
  let company = null;
  if (session.user.companyId) {
    company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        id: true,
        name: true,
      },
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session.user} company={company} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

