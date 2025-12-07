import { auth } from "@/lib/auth-server";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">User</h3>
          <p className="text-2xl font-bold mt-2">{session?.user?.name || "N/A"}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
          <p className="text-2xl font-bold mt-2">{session?.user?.email}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
          <p className="text-2xl font-bold mt-2 capitalize">{session?.user?.role?.toLowerCase()}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Company Type</h3>
          <p className="text-2xl font-bold mt-2 capitalize">{session?.user?.companyType?.toLowerCase()}</p>
        </div>
      </div>
    </div>
  );
}

