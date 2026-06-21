/**
 * AdminEvaInteractions.tsx
 * Manager Portal page: Eva AI call & SMS interaction log.
 *
 * Color coding:
 *   🟢 completed  — order placed and paid
 *   🟡 abandoned  — conversation started but customer hung up / stopped texting
 *   🔴 missed     — call/SMS never answered
 */
import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

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

type TranscriptMessage = { role: string; content: string };

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminEvaInteractions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "voice" | "sms">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "abandoned" | "missed">("all");
  const [selected, setSelected] = useState<Interaction | null>(null);
  const pageSize = 25;

  const { data, isLoading, refetch } = trpc.evaInteractions.list.useQuery({
    page,
    pageSize,
    channel: channelFilter,
    status: statusFilter as "all" | "completed" | "abandoned" | "missed" | "sms",
    search: search || undefined,
  });

  const { data: stats } = trpc.evaInteractions.stats.useQuery();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleCallBack(phone: string) {
    window.open(`tel:${phone}`, "_self");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Eva AI — Interactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All voice calls and SMS conversations handled by Eva
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

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
