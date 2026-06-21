/**
 * AdminEvaTraining.tsx
 * Manager Portal page: Eva AI Knowledge Base — teach Eva custom content.
 *
 * Categories:
 *   promo   — Current promotions and discounts
 *   faq     — Frequently asked questions
 *   policy  — Restaurant policies (cancellation, refunds, etc.)
 *   hours   — Hours, holidays, special schedules
 *   info    — General restaurant info
 *   custom  — Any other custom content
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Star,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  Clock,
  Info,
  HelpCircle,
  FileText,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type KnowledgeEntry = {
  id: number;
  category: string;
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Category = "promo" | "faq" | "policy" | "hours" | "info" | "custom";

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORIES: { value: Category; label: string; icon: React.ElementType; color: string }[] = [
  { value: "promo", label: "Promotion", icon: Sparkles, color: "bg-orange-500/10 text-orange-600 border-orange-300" },
  { value: "faq", label: "FAQ", icon: HelpCircle, color: "bg-blue-500/10 text-blue-600 border-blue-300" },
  { value: "policy", label: "Policy", icon: FileText, color: "bg-purple-500/10 text-purple-600 border-purple-300" },
  { value: "hours", label: "Hours", icon: Clock, color: "bg-teal-500/10 text-teal-600 border-teal-300" },
  { value: "info", label: "Info", icon: Info, color: "bg-gray-500/10 text-gray-600 border-gray-300" },
  { value: "custom", label: "Custom", icon: BookOpen, color: "bg-pink-500/10 text-pink-600 border-pink-300" },
];

function getCategoryMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[4];
}

const PLACEHOLDER_BY_CATEGORY: Record<string, string> = {
  promo: "Example: 'Buy any large pizza and get a free 2-liter soda. Valid Monday–Thursday only. Cannot be combined with other offers.'",
  faq: "Example: Q: Do you offer gluten-free crust?\nA: Yes! We offer gluten-free crust for an additional $2.50. Please inform us of any allergies when ordering.",
  policy: "Example: 'Orders can be cancelled within 5 minutes of placement. After that, a 50% cancellation fee applies.'",
  hours: "Example: 'We are open Monday–Thursday 11 AM–10 PM, Friday–Saturday 11 AM–11 PM, Sunday 12 PM–9 PM. We are closed on Thanksgiving and Christmas Day.'",
  info: "Example: 'We are located at 123 Main St, Las Vegas, NV 89101. Free parking is available in our lot.'",
  custom: "Enter any information you want Eva to know and share with customers…",
};

// ── Entry Card ─────────────────────────────────────────────────────────────────
function EntryCard({
  entry,
  onEdit,
  onDelete,
  onToggle,
}: {
  entry: KnowledgeEntry;
  onEdit: (e: KnowledgeEntry) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const meta = getCategoryMeta(entry.category);
  const Icon = meta.icon;
  const isExpired = entry.expiresAt && new Date(entry.expiresAt) < new Date();

  return (
    <Card className={`transition-all ${!entry.isActive || isExpired ? "opacity-50" : ""}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border ${meta.color} flex-shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{entry.title}</p>
              <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
              {isExpired && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">Expired</Badge>}
              {entry.priority >= 8 && <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-300 gap-1"><Star className="h-2.5 w-2.5" />High Priority</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {entry.content}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {entry.expiresAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires {new Date(entry.expiresAt).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Priority {entry.priority}
              </span>
              {entry.createdBy && <span>by {entry.createdBy}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={entry.isActive && !isExpired}
              onCheckedChange={v => onToggle(entry.id, v)}
              disabled={!!isExpired}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(entry.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────
function EntryFormDialog({
  open,
  onClose,
  initial,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<KnowledgeEntry> | null;
  onSave: (data: {
    category: Category;
    title: string;
    content: string;
    isActive: boolean;
    priority: number;
    expiresAt?: Date;
  }) => void;
  isSaving: boolean;
}) {
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? "info");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [priority, setPriority] = useState(String(initial?.priority ?? 5));
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : ""
  );

  // Reset when dialog opens with new initial
  const handleOpen = () => {
    setCategory((initial?.category as Category) ?? "info");
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setIsActive(initial?.isActive ?? true);
    setPriority(String(initial?.priority ?? 5));
    setExpiresAt(initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : "");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {initial?.id ? "Edit Knowledge Entry" : "Teach Eva Something New"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <c.icon className="h-3.5 w-3.5" />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Short descriptive title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label>Content <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder={PLACEHOLDER_BY_CATEGORY[category]}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Eva will use this text verbatim when answering related questions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority (1–10)</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n >= 8 ? "⭐ High" : n <= 3 ? "Low" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expires At */}
            <div className="space-y-1.5">
              <Label>Expires On (optional)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2.5">
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active" className="cursor-pointer">
              {isActive ? (
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Active — Eva will use this
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <XCircle className="h-4 w-4" /> Inactive — Eva will ignore this
                </span>
              )}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={() => onSave({
              category,
              title,
              content,
              isActive,
              priority: parseInt(priority),
              expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            })}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="gap-2"
          >
            {isSaving ? "Saving…" : initial?.id ? "Save Changes" : "Teach Eva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminEvaTraining() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: entries = [], isLoading } = trpc.evaKnowledge.list.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    activeOnly: false,
  });

  const createMutation = trpc.evaKnowledge.create.useMutation({
    onSuccess: () => {
      utils.evaKnowledge.list.invalidate();
      toast.success("Eva learned something new! 🧠", { description: "The entry is now active." });
      setFormOpen(false);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const updateMutation = trpc.evaKnowledge.update.useMutation({
    onSuccess: () => {
      utils.evaKnowledge.list.invalidate();
      toast.success("Entry updated", { description: "Eva's knowledge has been updated." });
      setFormOpen(false);
      setEditEntry(null);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const deleteMutation = trpc.evaKnowledge.delete.useMutation({
    onSuccess: () => {
      utils.evaKnowledge.list.invalidate();
      toast.success("Entry deleted");
      setDeleteId(null);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  function handleSave(data: {
    category: Category;
    title: string;
    content: string;
    isActive: boolean;
    priority: number;
    expiresAt?: Date;
  }) {
    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleToggle(id: number, active: boolean) {
    updateMutation.mutate({ id, isActive: active });
  }

  const activeCount = entries.filter(e => e.isActive && (!e.expiresAt || new Date(e.expiresAt) > new Date())).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Eva AI — Training
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Teach Eva promos, FAQs, policies, and any custom knowledge. She uses this in real-time when answering customers.
            </p>
          </div>
          <Button
            onClick={() => { setEditEntry(null); setFormOpen(true); }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Teach Eva
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">How Eva uses this knowledge</p>
            <p className="text-muted-foreground mt-0.5">
              Eva fetches all <strong>{activeCount} active</strong> entries before every conversation. Higher priority entries are considered more important.
              Entries with an expiry date are automatically disabled after that date.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            All ({entries.length})
          </Button>
          {CATEGORIES.map(c => {
            const count = entries.filter(e => e.category === c.value).length;
            if (count === 0) return null;
            return (
              <Button
                key={c.value}
                variant={categoryFilter === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(c.value)}
                className="gap-1.5"
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Entries */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Eva's knowledge base is empty</p>
            <p className="text-sm mt-1">Click "Teach Eva" to add your first entry</p>
            <Button className="mt-4 gap-2" onClick={() => { setEditEntry(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add First Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry as KnowledgeEntry}
                onEdit={e => { setEditEntry(e); setFormOpen(true); }}
                onDelete={id => setDeleteId(id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <EntryFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEntry(null); }}
        initial={editEntry}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Eva will no longer use this knowledge. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
