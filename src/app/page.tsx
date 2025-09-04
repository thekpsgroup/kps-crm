import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Building, Settings, TrendingUp, Phone, DollarSign } from "lucide-react";
import { Stat } from "@/components/ui/custom/stat";

export default function Home() {
  return (
    <AuthGuard>
      <AppShell>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome to your CRM dashboard
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Stat
              title="Total Deals"
              value="12"
              description="Active opportunities"
              icon={<BarChart3 className="w-4 h-4" />}
              trend={{ value: 12, label: "from last month", positive: true }}
            />
            <Stat
              title="Total Contacts"
              value="47"
              description="In your database"
              icon={<Users className="w-4 h-4" />}
              trend={{ value: 8, label: "from last month", positive: true }}
            />
            <Stat
              title="Pipeline Value"
              value="$125K"
              description="Total opportunity value"
              icon={<DollarSign className="w-4 h-4" />}
              trend={{ value: 5, label: "from last month", positive: true }}
            />
            <Stat
              title="Calls Made"
              value="23"
              description="This week"
              icon={<Phone className="w-4 h-4" />}
              trend={{ value: -2, label: "from last week", positive: false }}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                href="/deals"
                className="block transition-transform hover:scale-105"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      View Deals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Manage your sales pipeline and track opportunities
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/contacts"
                className="block transition-transform hover:scale-105"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="w-5 h-5 text-primary" />
                      View Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Keep track of your customers and prospects
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/companies"
                className="block transition-transform hover:scale-105"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building className="w-5 h-5 text-primary" />
                      View Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Organize and manage your business accounts
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/settings"
                className="block transition-transform hover:scale-105"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings className="w-5 h-5 text-primary" />
                      Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure your CRM preferences and options
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Recent activities will appear here</p>
                  <p className="text-sm mt-1">Start by adding some contacts and deals</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
    </AuthGuard>
  );
}
