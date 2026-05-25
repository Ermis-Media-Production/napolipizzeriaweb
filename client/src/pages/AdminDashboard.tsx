/**
 * Admin Dashboard — overview stats, recent orders, and quick actions.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ShoppingBag,
  DollarSign,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChefHat,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sliders,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.orders.adminStats.useQuery();
  const { data: recentOrders, isLoading: ordersLoading } = trpc.orders.listScheduledOrders.useQuery({
    limit: 8,
    offset: 0,
  });
  const { data: menuCount } = trpc.menuItems.list.useQuery({ includeUnavailable: true });

  const totalRevenue = stats?.totalRevenue ?? 0;
  const todayOrders = stats?.todayOrders ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const completedOrders = stats?.completedOrders ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back — here's what's happening at Napoli Pizzeria today.
          </p>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading stats…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ShoppingBag}
              label="Today's Orders"
              value={todayOrders}
              sub="orders placed today"
              color="bg-blue-600"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={pendingOrders}
              sub="awaiting preparation"
              color="bg-orange-500"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedOrders}
              sub="all time"
              color="bg-green-600"
            />
            <StatCard
              icon={DollarSign}
              label="Total Revenue"
              value={`$${Number(totalRevenue).toFixed(2)}`}
              sub="all paid orders"
              color="bg-red-700"
            />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setLocation("/admin/orders")}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">View Orders</p>
                  <p className="text-xs text-muted-foreground">Track & update order status</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setLocation("/admin/menu")}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-red-700" />
                <div>
                  <p className="font-medium text-sm">Menu Manager</p>
                  <p className="text-xs text-muted-foreground">
                    {menuCount ? `${menuCount.length} items` : "Add & edit menu items"}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setLocation("/admin/modifiers")}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Sliders className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm">Modifiers</p>
                  <p className="text-xs text-muted-foreground">Manage add-ons & options</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Orders
            </h2>
            <button
              onClick={() => setLocation("/admin/orders")}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : !recentOrders?.orders?.length ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <ChefHat className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Orders will appear here once customers start placing them.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Order Ref
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.orders.map((order, i) => (
                    <tr
                      key={order.id}
                      className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      onClick={() => setLocation("/admin/orders")}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        {order.orderRef}
                      </td>
                      <td className="px-4 py-3 text-foreground hidden sm:table-cell">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground hidden md:table-cell">
                        {order.orderType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        ${Number(order.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
