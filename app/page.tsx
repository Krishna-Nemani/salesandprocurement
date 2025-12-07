import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (session) {
    // Redirect based on company type
    if (session.user.companyType === "BUYER") {
      redirect("/buyer");
    } else if (session.user.companyType === "SELLER") {
      redirect("/seller");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                B2B Platform
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Streamline your business operations with our comprehensive B2B platform. 
              Manage RFQs, quotations, contracts, purchase orders, and more in one place.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-16 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>For Buyers</CardTitle>
                <CardDescription>
                  Create RFQs, manage quotations, and track orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Request for Quotations</li>
                  <li>✓ Manage Purchase Orders</li>
                  <li>✓ Track Deliveries</li>
                  <li>✓ Invoice Management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>For Sellers</CardTitle>
                <CardDescription>
                  Respond to RFQs, create quotations, and manage sales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Receive & Respond to RFQs</li>
                  <li>✓ Create Quotations</li>
                  <li>✓ Manage Sales Orders</li>
                  <li>✓ Track Deliveries & Invoices</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complete Solution</CardTitle>
                <CardDescription>
                  End-to-end B2B transaction management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Document Management</li>
                  <li>✓ Digital Signatures</li>
                  <li>✓ PDF Generation</li>
                  <li>✓ Real-time Tracking</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started Today</CardTitle>
              <CardDescription>
                Choose an option below to begin
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/auth/signup">Create Account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
