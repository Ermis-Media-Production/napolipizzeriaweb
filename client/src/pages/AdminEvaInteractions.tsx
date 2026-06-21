/**
 * AdminEvaInteractions.tsx
 * Manager Portal page: Eva AI call & SMS interaction log.
 *
 * Color coding:
 *   🟢 completed  — order placed and paid
 *   🟡 abandoned  — conversation started but customer hung up / stopped texting
 *   🔴 missed     — call/SMS never answered
 *
 * Alert system:
 *   - Polls getNewAlerts every 15s
 *   - Plays a chime sound when new missed/abandoned calls arrive
 *   - Shows a flashing red/yellow banner with count + dismiss button
 *   - Shows alert badge count on the sidebar nav item (via context)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PhoneCall,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  BellRing,
  X,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type Interaction = {
  id: number;
  externalId: string;
  channel: string;
  status: string;
  customerPhone: string;
  customerName: string | null;
  endedBy: string | null;
  durationSeconds: number | null;
  transcript: string | null;
  recordingUrl: string | null;
  summary: string | null;
  orderId: string | null;
  totalCents: number | null;
  createdAt: Date;
};

type AlertItem = {
  id: number;
  status: string;
  customerPhone: string;
  customerName: string | null;
  createdAt: Date;
};

type TranscriptMessage = { role: string; content: string };

// ── Alert sound (short chime generated via Web Audio API) ─────────────────────
function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.3, 0.4);
    playTone(1100, now + 0.18, 0.3, 0.35);
    playTone(1320, now + 0.36, 0.45, 0.3);
  } catch {
    // AudioContext not supported — silent fallback
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status: string) {
  if (status === "completed") return "bg-green-500/15 text-green-700 border-green-300 dark:text-green-400";
  if (status === "abandoned") return "bg-yellow-500/15 text-yellow-700 border-yellow-300 dark:text-yellow-400";
  return "bg-red-500/15 text-red-700 border-red-300 dark:text-red-400";
}

function statusDot(status: string) {
  if (status === "completed") return "bg-green-500";
  if (status === "abandoned") return "bg-yellow-400";
  return "bg-red-500";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "abandoned") return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function parseTranscript(raw: string | null): TranscriptMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TranscriptMessage[];
  } catch { /* plain text */ }
  return [{ role: "transcript", content: raw }];
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────
function AlertBanner({
  alerts,
  onDismiss,
  onCallBack,
}: {
  alerts: AlertItem[];
  onDismiss: () => void;
  onCallBack: (phone: string) => void;
}) {
  const missedCount = alerts.filter(a => a.status === "missed").length;
  const abandonedCount = alerts.filter(a => a.status === "abandoned").length;
  const hasMissed = missedCount > 0;

  return (
    <div
      className={`
        relative rounded-xl border-2 p-4 shadow-lg
        ${hasMissed
          ? "border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-600"
          : "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 dark:border-yellow-600"
        }
        animate-[pulse_1.5s_ease-in-out_3]
      `}
      style={{
        animation: "alertPulse 1.5s ease-in-out 3",
      }}
    >
      <style>{`
        @keyframes alertPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${hasMissed ? "bg-red-100 dark:bg-red-900/60" : "bg-yellow-100 dark:bg-yellow-900/60"}`}>
            <BellRing className={`h-5 w-5 ${hasMissed ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${hasMissed ? "text-red-800 dark:text-red-300" : "text-yellow-800 dark:text-yellow-300"}`}>
              {alerts.length === 1
                ? `1 ${alerts[0].status === "missed" ? "missed call" : "abandoned call"} needs attention`
                : `${alerts.length} calls need attention`
              }
              {missedCount > 0 && abandonedCount > 0 && (
                <span className="font-normal ml-1">
                  ({missedCount} missed, {abandonedCount} abandoned)
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alerts.slice(0, 5).map(alert => (
                <button
                  key={alert.id}
                  onClick={() => onCallBack(alert.customerPhone)}
                  className={`
                    inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
                    transition-colors cursor-pointer
                    ${alert.status === "missed"
                      ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/60 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/60 dark:text-yellow-300"
                    }
                  `}
                >
                  <PhoneCall className="h-3 w-3" />
                  {alert.customerName || formatPhone(alert.customerPhone)}
                  <span className="opacity-60">· {alert.status}</span>
                </button>
              ))}
              {alerts.length > 5 && (
                <span className="text-xs text-muted-foreground self-center">+{alerts.length - 5} more</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Dismiss all alerts"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminEvaInteractions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "voice" | "sms">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "abandoned" | "missed">("all");
  const [selected, setSelected] = useState<Interaction | null>(null);
  const [alertsMuted, setAlertsMuted] = useState(false);
  const pageSize = 25;

  // Track the last seen alert IDs to detect new ones
  const seenAlertIds = useRef<Set<number>>(new Set());
  const isFirstPoll = useRef(true);

  const { data, isLoading, refetch } = trpc.evaInteractions.list.useQuery({
    page,
    pageSize,
    channel: channelFilter,
    status: statusFilter as "all" | "completed" | "abandoned" | "missed" | "sms",
    search: search || undefined,
  });

  const { data: stats } = trpc.evaInteractions.stats.useQuery();

  // Poll for new unacknowledged alerts every 15 seconds
  const { data: alertData, refetch: refetchAlerts } = trpc.evaInteractions.getNewAlerts.useQuery(
    undefined,
    { refetchInterval: 15_000 }
  );

  const acknowledgeMutation = trpc.evaInteractions.acknowledgeAlerts.useMutation({
    onSuccess: () => {
      refetchAlerts();
      toast.success("All alerts dismissed");
    },
  });

  const alerts: AlertItem[] = alertData ?? [];

  // Detect new alerts and play sound
  useEffect(() => {
    if (!alertData) return;

    if (isFirstPoll.current) {
      // On first load, just populate seenAlertIds without playing sound
      alertData.forEach(a => seenAlertIds.current.add(a.id));
      isFirstPoll.current = false;
      return;
    }

    const newAlerts = alertData.filter(a => !seenAlertIds.current.has(a.id));
    if (newAlerts.length > 0) {
      newAlerts.forEach(a => seenAlertIds.current.add(a.id));
      if (!alertsMuted) {
        playAlertChime();
      }
      const missedNew = newAlerts.filter(a => a.status === "missed").length;
      const abandonedNew = newAlerts.filter(a => a.status === "abandoned").length;
      const label = missedNew > 0 && abandonedNew > 0
        ? `${missedNew} missed, ${abandonedNew} abandoned`
        : missedNew > 0
        ? `${missedNew} missed call${missedNew > 1 ? "s" : ""}`
        : `${abandonedNew} abandoned call${abandonedNew > 1 ? "s" : ""}`;
      toast.error(`⚠️ Eva Alert: ${label}`, {
        duration: 8000,
        description: "Check the Eva Interactions panel",
      });
    }
  }, [alertData, alertsMuted]);

  const handleDismissAlerts = useCallback(() => {
    // Mark all as seen locally
    alerts.forEach(a => seenAlertIds.current.add(a.id));
    acknowledgeMutation.mutate();
  }, [alerts, acknowledgeMutation]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleCallBack(phone: string) {
    window.open(`tel:${phone}`, "_self");
  }

  return (
    <DashboardLayout alertCount={alerts.length}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Eva AI — Interactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All voice calls and SMS conversations handled by Eva
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertsMuted(m => !m)}
              className={`gap-2 ${alertsMuted ? "text-muted-foreground" : ""}`}
              title={alertsMuted ? "Unmute alerts" : "Mute alert sound"}
            >
              {alertsMuted ? <BellOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{alertsMuted ? "Unmuted" : "Muted"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchAlerts(); }} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <AlertBanner
            alerts={alerts}
            onDismiss={handleDismissAlerts}
            onCallBack={handleCallBack}
          />
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Completed Today" value={stats.today.completed} icon={CheckCircle2} color="bg-green-500/10 text-green-600" />
            <StatCard label="Abandoned Today" value={stats.today.abandoned} icon={AlertCircle} color="bg-yellow-500/10 text-yellow-600" />
            <StatCard label="Missed Today" value={stats.today.missed} icon={XCircle} color="bg-red-500/10 text-red-600" />
            <StatCard label="SMS Today" value={stats.today.sms} icon={MessageSquare} color="bg-blue-500/10 text-blue-600" />
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Completed — order placed</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Abandoned — hung up mid-conversation</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Missed — never answered</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <Input
              placeholder="Search phone or name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={channelFilter} onValueChange={v => { setChannelFilter(v as "all" | "voice" | "sms"); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as "all" | "completed" | "abandoned" | "missed"); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-3">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Channel</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ended By</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-muted rounded animate-pulse w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !data?.interactions.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No interactions found</p>
                        <p className="text-xs mt-1">Eva's calls and SMS conversations will appear here</p>
                      </td>
                    </tr>
                  ) : (
                    data.interactions.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelected(item as Interaction)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(item.status)}`} />
                            <StatusIcon status={item.status} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.customerName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(item.customerPhone)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="gap-1 text-xs">
                            {item.channel === "voice"
                              ? <><Phone className="h-3 w-3" /> Voice</>
                              : <><MessageSquare className="h-3 w-3" /> SMS</>
                            }
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDuration(item.durationSeconds)}
                        </td>
                        <td className="px-4 py-3">
                          {item.endedBy ? (
                            <Badge variant="outline" className="text-xs capitalize">{item.endedBy}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {item.orderId ? (
                            <Badge className="text-xs bg-green-500/10 text-green-700 border-green-300">
                              {item.orderId.slice(0, 12)}…
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            onClick={() => handleCallBack(item.customerPhone)}
                          >
                            <PhoneCall className="h-3 w-3" />
                            Call Back
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {data.total} total · page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${statusDot(selected.status)}`} />
                  {selected.customerName || "Unknown Customer"}
                  <Badge variant="outline" className={`text-xs ${statusColor(selected.status)}`}>
                    {selected.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{formatPhone(selected.customerPhone)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Channel</p>
                    <p className="font-medium capitalize">{selected.channel}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="font-medium">{formatDuration(selected.durationSeconds)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ended By</p>
                    <p className="font-medium capitalize">{selected.endedBy || "—"}</p>
                  </div>
                  {selected.orderId && (
                    <div className="bg-green-500/10 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                      <p className="font-medium text-green-700 dark:text-green-400">{selected.orderId}</p>
                    </div>
                  )}
                  {selected.totalCents && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Total Charged</p>
                      <p className="font-medium">${(selected.totalCents / 100).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                    <p className="font-medium">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Summary */}
                {selected.summary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
                    <p className="text-sm bg-muted/40 rounded-lg p-3 leading-relaxed">{selected.summary}</p>
                  </div>
                )}

                {/* Recording */}
                {selected.recordingUrl && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Volume2 className="h-3 w-3" /> Recording
                    </p>
                    <audio controls src={selected.recordingUrl} className="w-full h-10" />
                  </div>
                )}

                {/* Transcript */}
                {selected.transcript && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Transcript</p>
                    <div className="space-y-2 max-h-72 overflow-y-auto bg-muted/20 rounded-lg p-3">
                      {parseTranscript(selected.transcript).map((msg, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 ${msg.role === "assistant" ? "flex-row-reverse" : ""}`}
                        >
                          <div className={`text-xs px-3 py-2 rounded-xl max-w-[80%] leading-relaxed ${
                            msg.role === "assistant"
                              ? "bg-primary text-primary-foreground"
                              : msg.role === "user"
                              ? "bg-muted"
                              : "bg-muted/60 italic text-muted-foreground"
                          }`}>
                            <span className="block text-[10px] opacity-60 mb-0.5 capitalize">{msg.role}</span>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    className="gap-2 flex-1"
                    onClick={() => handleCallBack(selected.customerPhone)}
                  >
                    <PhoneCall className="h-4 w-4" />
                    Call Back {formatPhone(selected.customerPhone)}
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
