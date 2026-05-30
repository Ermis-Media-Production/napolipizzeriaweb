/**
 * Admin AI Costs Panel
 * Displays LLM token usage and estimated costs for monitoring AI expenses.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  DollarSign,
  Zap,
  MessageSquare,
  TrendingUp,
  Loader2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
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

// ── Feature label map ─────────────────────────────────────────────────────────
const FEATURE_LABELS: Record<string, string> = {
  eva_chat: "Eva Chat",
  eva_normalize: "Eva Normalize",
  other: "Other",
};

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(4)}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminAiCosts() {
  const { data, isLoading, error } = trpc.aiUsage.getStats.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-600" />
            AI Cost Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track Eva AI token usage and estimated costs. Pricing based on GPT-4o-mini rates.
          </p>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading AI usage data…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">
              {error.message.includes("Admin") ? "Admin access required to view AI costs." : "Failed to load AI usage data."}
            </span>
          </div>
        )}

        {data && (
          <>
            {/* Stat cards — 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={DollarSign}
                label="Cost This Month"
                value={fmtCost(data.thisMonth.costUsd)}
                sub={`${fmtTokens(data.thisMonth.tokens)} tokens · ${data.thisMonth.calls} calls`}
                color="bg-purple-600"
              />
              <StatCard
                icon={Zap}
                label="Cost Today"
                value={fmtCost(data.today.costUsd)}
                sub={`${fmtTokens(data.today.tokens)} tokens · ${data.today.calls} calls`}
                color="bg-blue-600"
              />
              <StatCard
                icon={TrendingUp}
                label="All-Time Cost"
                value={fmtCost(data.allTime.costUsd)}
                sub={`${fmtTokens(data.allTime.tokens)} tokens · ${data.allTime.calls} calls`}
                color="bg-green-600"
              />
            </div>

            {/* Daily cost chart (last 30 days) */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-foreground">Daily Cost — Last 30 Days</h2>
              </div>
              {data.daily.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bot className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No AI usage recorded yet.</p>
                  <p className="text-xs mt-1">Eva AI calls will appear here once customers start chatting.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + "T00:00:00");
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => `$${v.toFixed(4)}`}
                      width={72}
                    />
                    <Tooltip
                      formatter={(v: number) => [`$${v.toFixed(6)}`, "Cost (USD)"]}
                      labelFormatter={(l: string) => {
                        const d = new Date(l + "T00:00:00");
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="costUsd"
                      stroke="#9333ea"
                      strokeWidth={2}
                      fill="url(#costGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Daily token chart */}
            {data.daily.length > 0 && (
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-foreground">Daily Tokens — Last 30 Days</h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + "T00:00:00");
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => fmtTokens(v)}
                      width={52}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmtTokens(v), "Tokens"]}
                      labelFormatter={(l: string) => {
                        const d = new Date(l + "T00:00:00");
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="totalTokens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-feature breakdown */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-foreground">Breakdown by Feature</h2>
              </div>
              {data.byFeature.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No data yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feature</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calls</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tokens</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byFeature.map((row, i) => (
                      <tr key={row.feature} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-5 py-3 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-purple-500" />
                            {featureLabel(row.feature)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{row.calls.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{fmtTokens(row.tokens)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">{fmtCost(row.costUsd)}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-5 py-3 text-foreground">Total</td>
                      <td className="px-5 py-3 text-right text-foreground">{data.allTime.calls.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-foreground">{fmtTokens(data.allTime.tokens)}</td>
                      <td className="px-5 py-3 text-right text-purple-600">{fmtCost(data.allTime.costUsd)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Pricing reference */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Pricing Reference (GPT-4o-mini)</p>
              <p>Input tokens: $0.150 / 1M tokens &nbsp;·&nbsp; Output tokens: $0.600 / 1M tokens</p>
              <p className="mt-1">Costs are estimates based on token counts. Actual billing may vary slightly.</p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
