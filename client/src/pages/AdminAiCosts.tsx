/**
 * Admin AI Costs Panel
 * Displays LLM token usage, estimated costs, and monthly alert threshold config.
 */
import { useState } from "react";
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
  Bell,
  CheckCircle2,
  Image,
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
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {badge}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Feature label map ─────────────────────────────────────────────────────────
const FEATURE_LABELS: Record<string, string> = {
  eva_chat:          "Eva Chat",
  eva_normalize:     "Eva Normalize",
  menu_item_photo:   "Menu Item Photo",
  menu_description:  "Menu Description",
  image_generation:  "Image Generation",
  other:             "Other",
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
  return `$${n.toFixed(4)}`;
}

// ── Alert threshold panel ─────────────────────────────────────────────────────
function AlertThresholdPanel({ currentThreshold }: { currentThreshold: number }) {
  const [inputVal, setInputVal] = useState(currentThreshold.toFixed(2));
  const [saved, setSaved] = useState(false);
  const utils = trpc.useUtils();

  const setThreshold = trpc.aiUsage.setAlertThreshold.useMutation({
    onSuccess: (data) => {
      setSaved(true);
      setInputVal(data.threshold.toFixed(2));
      utils.aiUsage.getStats.invalidate();
      toast.success(`Alert threshold set to $${data.threshold.toFixed(2)}/month`);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      toast.error(`Failed to save threshold: ${err.message}`);
    },
  });

  const handleSave = () => {
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0.01) {
      toast.error("Please enter a valid amount (minimum $0.01)");
      return;
    }
    setThreshold.mutate({ threshold: val });
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground">Monthly Cost Alert</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        You will receive a notification when your monthly AI cost exceeds this threshold.
        The alert fires once per calendar month.
      </p>
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            min="0.01"
            step="1"
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setSaved(false); }}
            className="pl-7 w-32 text-sm"
            placeholder="50.00"
          />
        </div>
        <span className="text-xs text-muted-foreground">USD / month</span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={setThreshold.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {setThreshold.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Saved</>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Pricing reference table ───────────────────────────────────────────────────
function PricingReference() {
  const models = [
    { model: "gpt-4o-mini",  input: "$0.15",  output: "$0.60",  note: "Default · Eva AI" },
    { model: "gpt-4o",       input: "$2.50",  output: "$10.00", note: "High quality" },
    { model: "gpt-4-turbo",  input: "$10.00", output: "$30.00", note: "Legacy" },
    { model: "o1-mini",      input: "$3.00",  output: "$12.00", note: "Reasoning" },
    { model: "o3-mini",      input: "$1.10",  output: "$4.40",  note: "Reasoning" },
    { model: "dall-e-3",     input: "$0.040", output: "—",      note: "Per image (1024²)" },
    { model: "dall-e-2",     input: "$0.020", output: "—",      note: "Per image (1024²)" },
  ];

  return (
    <div className="rounded-xl border bg-muted/30 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <Image className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Model Pricing Reference</h2>
        <span className="ml-auto text-xs text-muted-foreground">per 1M tokens · June 2025</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Model</th>
            <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Input</th>
            <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Output</th>
            <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={m.model} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
              <td className="px-5 py-2.5 font-mono text-foreground">{m.model}</td>
              <td className="px-5 py-2.5 text-right text-foreground">{m.input}</td>
              <td className="px-5 py-2.5 text-right text-foreground">{m.output}</td>
              <td className="px-5 py-2.5 text-right text-muted-foreground">{m.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 py-3 text-xs text-muted-foreground border-t">
        Costs are estimates based on token counts. Actual billing may vary. Image generation costs are per image, not per token.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminAiCosts() {
  const { data, isLoading, error } = trpc.aiUsage.getStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  // Compute alert badge for "this month" card
  const alertPct = data
    ? Math.min(100, Math.round((data.thisMonth.costUsd / data.alertThreshold) * 100))
    : 0;

  const alertBadge = data ? (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        alertPct >= 100
          ? "bg-red-100 text-red-700"
          : alertPct >= 75
          ? "bg-amber-100 text-amber-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {alertPct}% of ${data.alertThreshold.toFixed(0)} limit
    </span>
  ) : null;

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
            Track Eva AI and image generation usage, estimated costs, and configure monthly alerts.
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
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={DollarSign}
                label="Cost This Month"
                value={fmtCost(data.thisMonth.costUsd)}
                sub={`${fmtTokens(data.thisMonth.tokens)} tokens · ${data.thisMonth.calls} calls`}
                color="bg-purple-600"
                badge={alertBadge}
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

            {/* Alert threshold config */}
            <AlertThresholdPanel currentThreshold={data.alertThreshold} />

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
            <PricingReference />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
