/**
 * AdminItemsDashboard — Clover-style Items management dashboard.
 * Sections: Item List, Categories, Modifier Groups, Printer Labels, Discounts
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Search, Plus, Pencil, Trash2, Upload, Loader2, ImageOff,
  ToggleLeft, ToggleRight, Tag, Layers, Printer, Percent,
  ChevronRight, ChevronDown, Check, X, Package, Settings2,
  RefreshCw, CloudDownload, CheckSquare, Square, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRINT_LABELS = ["Food", "Pizza", "Pizzeria", "Bar/Drinks"] as const;
type PrintLabel = (typeof PRINT_LABELS)[number];

const PRINT_LABEL_INFO: Record<PrintLabel, { color: string; description: string }> = {
  "Food": { color: "#dd6b20", description: "Kitchen printer — sandwiches, wraps, salads, wings, soups, appetizers, kids items" },
  "Pizza": { color: "#e53e3e", description: "Pizza station printer — all pizza items" },
  "Pizzeria": { color: "#6b46c1", description: "Pizzeria printer — pasta, calzones, specialty Italian items" },
  "Bar/Drinks": { color: "#0bc5ea", description: "Bar/Drinks printer — beverages, desserts" },
};

type Section = "items" | "categories" | "modifiers" | "labels" | "discounts";

const NAV_SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "items", label: "Item List", icon: Package },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "modifiers", label: "Modifier Groups", icon: Layers },
  { id: "labels", label: "Printer Labels", icon: Printer },
  { id: "discounts", label: "Discounts", icon: Percent },
];

// ── Item Form ─────────────────────────────────────────────────────────────────

interface ItemFormData {
  name: string;
  category: string;
  description: string;
  price: string;
  price2: string;
  price2Label: string;
  printLabel: PrintLabel;
  isAvailable: boolean;
  sortOrder: string;
}

const DEFAULT_ITEM_FORM: ItemFormData = {
  name: "", category: "pizza", description: "", price: "",
  price2: "", price2Label: "", printLabel: "Food", isAvailable: true, sortOrder: "0",
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminItemsDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("items");

  return (
    <AdminLayout>
      <div className="flex h-full min-h-[calc(100vh-6rem)] gap-0">
        {/* Left sidebar nav */}
        <aside className="w-52 shrink-0 border-r border-border/60 bg-muted/20 rounded-l-xl">
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-red-700" />
              <span className="font-semibold text-sm">Items</span>
            </div>
          </div>
          <nav className="py-2">
            {NAV_SECTIONS.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
                    ${isActive
                      ? "bg-red-50 text-red-700 font-medium border-r-2 border-red-700"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 p-6">
          {activeSection === "items" && <ItemListSection />}
          {activeSection === "categories" && <CategoriesSection />}
          {activeSection === "modifiers" && <ModifierGroupsSection />}
          {activeSection === "labels" && <PrinterLabelsSection />}
          {activeSection === "discounts" && <DiscountsSection />}
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Item List Section ─────────────────────────────────────────────────────────

function ItemListSection() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemFormData>(DEFAULT_ITEM_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [pendingUploadItemId, setPendingUploadItemId] = useState<number | null>(null);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [modifierItemId, setModifierItemId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkLabelOpen, setBulkLabelOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; skipped: number; total: number; syncedAt: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.menuItems.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
    includeUnavailable: true,
  });
  const { data: categories = [] } = trpc.itemCategories.list.useQuery();
  const { data: allGroups = [] } = trpc.modifiers.listGroups.useQuery();

  const filteredItems = items.filter((item) =>
    search === "" ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = trpc.menuItems.create.useMutation({
    onSuccess: () => { toast.success("Item created"); utils.menuItems.list.invalidate(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.menuItems.update.useMutation({
    onSuccess: () => { toast.success("Item updated"); utils.menuItems.list.invalidate(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.menuItems.delete.useMutation({
    onSuccess: () => { toast.success("Item deleted"); utils.menuItems.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.menuItems.toggleAvailability.useMutation({
    onSuccess: () => utils.menuItems.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const uploadPhotoMutation = trpc.menuItems.uploadPhoto.useMutation({
    onSuccess: () => { toast.success("Photo updated"); utils.menuItems.list.invalidate(); setUploadingId(null); },
    onError: (e) => { toast.error(e.message); setUploadingId(null); },
  });
  const setGroupsMutation = trpc.modifiers.setGroupsForItem.useMutation({
    onSuccess: () => { toast.success("Modifiers updated"); setModifierDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const syncMutation = trpc.cloverItemSync.syncFromClover.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      utils.menuItems.list.invalidate();
      toast.success(`Sync complete: ${data.created} new, ${data.updated} updated`);
    },
    onError: (e) => toast.error(`Sync failed: ${e.message}`),
  });
  const bulkUpdateMutation = trpc.menuItems.bulkUpdate.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated} items`);
      utils.menuItems.list.invalidate();
      setSelectedIds(new Set());
      setBulkCategoryOpen(false);
      setBulkLabelOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: syncInfo } = trpc.cloverItemSync.getLastSyncInfo.useQuery();

  // Bulk selection helpers
  const allFilteredIds = filteredItems.map((i) => i.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleSelectOne(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_ITEM_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: (typeof items)[0]) {
    setEditingId(item.id);
    setForm({
      name: item.name, category: item.category, description: item.description ?? "",
      price: item.price, price2: item.price2 ?? "", price2Label: item.price2Label ?? "",
      printLabel: (item.printLabel as PrintLabel) ?? "Food",
      isAvailable: item.isAvailable, sortOrder: String(item.sortOrder),
    });
    setDialogOpen(true);
  }

  async function openModifiers(item: (typeof items)[0]) {
    setModifierItemId(item.id);
    // Load existing assignments
    const assignments = await utils.modifiers.listGroupsForItem.fetch({ itemId: item.id });
    setSelectedGroupIds((assignments as { id: number }[]).map((g) => g.id));
    setModifierDialogOpen(true);
  }

  function handleSave() {
    const price = parseFloat(form.price);
    if (!form.name.trim()) return toast.error("Name is required");
    if (isNaN(price) || price < 0) return toast.error("Valid price is required");
    const payload = {
      name: form.name.trim(), category: form.category,
      description: form.description.trim() || undefined,
      price, price2: form.price2 ? parseFloat(form.price2) : undefined,
      price2Label: form.price2Label.trim() || undefined,
      printLabel: form.printLabel, isAvailable: form.isAvailable,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    if (editingId !== null) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || pendingUploadItemId === null) return;
    setUploadingId(pendingUploadItemId);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhotoMutation.mutate({ itemId: pendingUploadItemId, base64Data: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function getCategoryColor(slug: string) {
    return categories.find((c) => c.slug === slug)?.color ?? "#6b7280";
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Item List</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">{items.length} items total</p>
            {syncInfo?.syncedItemCount ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {syncInfo.syncedItemCount} synced from Clover
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSyncDialogOpen(true)}
            className="gap-2"
          >
            <CloudDownload className="h-4 w-4" />
            Sync from Clover
          </Button>
          <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Bulk action bar — appears when items are selected */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {/* Bulk category change */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Category:</span>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v) bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), category: v });
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Change..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Bulk printer label change */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Printer:</span>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v) bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), printLabel: v as PrintLabel });
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Change..." />
                </SelectTrigger>
                <SelectContent>
                  {PRINT_LABELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PRINT_LABEL_INFO[l].color }} />
                        {l}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10 pl-3">
                <button onClick={toggleSelectAll} className="flex items-center justify-center">
                  {allSelected
                    ? <CheckSquare className="h-4 w-4 text-blue-600" />
                    : someSelected
                    ? <CheckSquare className="h-4 w-4 text-blue-400 opacity-60" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
              </TableHead>
              <TableHead className="w-14">Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Printer Label</TableHead>
              <TableHead>Modifiers</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  {search ? "No items match your search" : "No items yet. Click \"Add Item\" to create one."}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    selectedIds.has(item.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-3">
                    <button
                      onClick={() => toggleSelectOne(item.id)}
                      className="flex items-center justify-center"
                    >
                      {selectedIds.has(item.id)
                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  {/* Photo */}
                  <TableCell>
                    <div className="relative w-10 h-10 rounded-md overflow-hidden border bg-muted/40 group cursor-pointer"
                      onClick={() => { setPendingUploadItemId(item.id); fileInputRef.current?.click(); }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {uploadingId === item.id
                          ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                          : <Upload className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  </TableCell>
                  {/* Name */}
                  <TableCell>
                    <div className="font-medium text-sm">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-48">{item.description}</div>
                    )}
                  </TableCell>
                  {/* Category */}
                  <TableCell>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      {item.category}
                    </span>
                  </TableCell>
                  {/* Price */}
                  <TableCell>
                    <div className="text-sm font-medium">${parseFloat(item.price).toFixed(2)}</div>
                    {item.price2 && (
                      <div className="text-xs text-muted-foreground">
                        {item.price2Label || "2nd"}: ${parseFloat(item.price2).toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  {/* Printer Label */}
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: PRINT_LABEL_INFO[item.printLabel as PrintLabel]?.color ?? "#6b7280" }}
                    >
                      <Printer className="h-3 w-3" />
                      {item.printLabel}
                    </span>
                  </TableCell>
                  {/* Modifiers */}
                  <TableCell>
                    <button
                      onClick={() => openModifiers(item)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Layers className="h-3 w-3" />
                      Assign
                    </button>
                  </TableCell>
                  {/* Available */}
                  <TableCell>
                    <button
                      onClick={() => toggleMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {item.isAvailable
                        ? <ToggleRight className="h-5 w-5 text-green-600" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      <span className={item.isAvailable ? "text-green-600" : "text-muted-foreground"}>
                        {item.isAvailable ? "Yes" : "No"}
                      </span>
                    </button>
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Margherita Pizza" />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price *</Label>
                <Input type="number" step="0.01" min="0" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.length > 0
                      ? categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)
                      : ["pizza","burger","pasta","salad","soup","sandwich","wrap","wings","appetizer","kids","beverage","dessert","special","catering"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>2nd Price (optional)</Label>
                <Input type="number" step="0.01" min="0" value={form.price2}
                  onChange={(e) => setForm({ ...form, price2: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>2nd Price Label</Label>
                <Input value={form.price2Label}
                  onChange={(e) => setForm({ ...form, price2Label: e.target.value })} placeholder="e.g. Large" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Printer Label *</Label>
                <Select value={form.printLabel} onValueChange={(v) => setForm({ ...form, printLabel: v as PrintLabel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRINT_LABELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PRINT_LABEL_INFO[l].color }} />
                          {l}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} />
                <Label>Available for ordering</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-red-700 hover:bg-red-800 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId !== null ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier Assignment Dialog */}
      <Dialog open={modifierDialogOpen} onOpenChange={setModifierDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Modifier Groups</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {allGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No modifier groups yet. Create them in the Modifier Groups section.
              </p>
            ) : (
              allGroups.map((group) => {
                const checked = selectedGroupIds.includes(group.id);
                return (
                  <label key={group.id}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${checked ? "bg-red-700 border-red-700" : "border-muted-foreground/40"}`}
                      onClick={() => setSelectedGroupIds(checked
                        ? selectedGroupIds.filter((id) => id !== group.id)
                        : [...selectedGroupIds, group.id]
                      )}>
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{group.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                        {group.required ? " · Required" : " · Optional"}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifierDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => modifierItemId !== null && setGroupsMutation.mutate({ itemId: modifierItemId, groupIds: selectedGroupIds })}
              disabled={setGroupsMutation.isPending}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              {setGroupsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Modifiers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync from Clover Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={(o) => { setSyncDialogOpen(o); if (!o) setSyncResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudDownload className="h-5 w-5 text-green-600" />
              Sync Items from Clover
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {syncResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Sync completed successfully</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{syncResult.created}</div>
                    <div className="text-xs text-muted-foreground mt-1">New items</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{syncResult.updated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Updated</div>
                  </div>
                  <div className="text-center p-3 bg-muted/40 rounded-lg">
                    <div className="text-2xl font-bold">{syncResult.skipped}</div>
                    <div className="text-xs text-muted-foreground mt-1">Hidden/skipped</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {syncResult.total} total items found in Clover &bull; Synced at {new Date(syncResult.syncedAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
                  <strong>Note:</strong> Printer label assignments you set manually in this dashboard were preserved. Only new items received auto-assigned labels.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This will pull all visible items from your Clover POS and import them into this dashboard.
                </p>
                <ul className="text-sm space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> New Clover items will be <strong>added</strong> to the local database</li>
                  <li className="flex items-start gap-2"><RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" /> Existing synced items will have name, price &amp; category <strong>updated</strong></li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /> Your custom <strong>printer label</strong> assignments are <strong>preserved</strong></li>
                  <li className="flex items-start gap-2"><X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /> Items only in local DB (not in Clover) are <strong>not deleted</strong></li>
                </ul>
                {syncInfo?.lastSyncAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last synced: {new Date(syncInfo.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSyncDialogOpen(false); setSyncResult(null); }}>Close</Button>
            {!syncResult && (
              <Button
                onClick={() => syncMutation.mutate({ overridePrintLabels: false })}
                disabled={syncMutation.isPending}
                className="bg-green-700 hover:bg-green-800 text-white gap-2"
              >
                {syncMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
                  : <><CloudDownload className="h-4 w-4" /> Start Sync</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Categories Section ────────────────────────────────────────────────────────

function CategoriesSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [sortOrder, setSortOrder] = useState("0");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.itemCategories.list.useQuery();
  const { data: allItems = [] } = trpc.menuItems.list.useQuery({ includeUnavailable: true });

  const seedMutation = trpc.itemCategories.seedDefaults.useMutation({
    onSuccess: (r) => { toast.success(r.message); utils.itemCategories.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.itemCategories.create.useMutation({
    onSuccess: () => { toast.success("Category created"); utils.itemCategories.list.invalidate(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.itemCategories.update.useMutation({
    onSuccess: () => { toast.success("Category updated"); utils.itemCategories.list.invalidate(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.itemCategories.delete.useMutation({
    onSuccess: () => { toast.success("Category deleted"); utils.itemCategories.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null); setName(""); setSlug(""); setColor("#6b7280"); setSortOrder("0");
    setDialogOpen(true);
  }
  function openEdit(cat: (typeof categories)[0]) {
    setEditingId(cat.id); setName(cat.name); setSlug(cat.slug); setColor(cat.color); setSortOrder(String(cat.sortOrder));
    setDialogOpen(true);
  }
  function handleSave() {
    if (!name.trim()) return toast.error("Name is required");
    if (!slug.trim()) return toast.error("Slug is required");
    const payload = { name: name.trim(), slug: slug.trim().toLowerCase().replace(/\s+/g, "-"), color, sortOrder: parseInt(sortOrder) || 0 };
    if (editingId !== null) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Seed Defaults
            </Button>
          )}
          <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-3 text-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No categories yet. Click "Seed Defaults" to load the standard categories or "Add Category" to create one.
          </div>
        ) : (
          categories.map((cat) => {
            const itemCount = allItems.filter((i) => i.category === cat.slug).length;
            return (
              <div key={cat.id} className="border rounded-lg p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: cat.color }}>
                  {cat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">slug: {cat.slug} · {itemCount} item{itemCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => {
                setName(e.target.value);
                if (editingId === null) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }} placeholder="e.g. Pizza" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug * <span className="text-xs text-muted-foreground">(used in menu items)</span></Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))} placeholder="e.g. pizza" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6b7280" className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-red-700 hover:bg-red-800 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId !== null ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>Items in this category will keep their category slug but the category label will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Modifier Groups Section ───────────────────────────────────────────────────

function ModifierGroupsSection() {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMin, setGroupMin] = useState("0");
  const [groupMax, setGroupMax] = useState("1");
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [optionGroupId, setOptionGroupId] = useState<number | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("0");
  const [optionDefault, setOptionDefault] = useState(false);
  const [deleteOptionId, setDeleteOptionId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: groups = [], isLoading } = trpc.modifiers.listGroups.useQuery();

  const createGroupMutation = trpc.modifiers.createGroup.useMutation({
    onSuccess: () => { toast.success("Group created"); utils.modifiers.listGroups.invalidate(); setGroupDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateGroupMutation = trpc.modifiers.updateGroup.useMutation({
    onSuccess: () => { toast.success("Group updated"); utils.modifiers.listGroups.invalidate(); setGroupDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGroupMutation = trpc.modifiers.deleteGroup.useMutation({
    onSuccess: () => { toast.success("Group deleted"); utils.modifiers.listGroups.invalidate(); setDeleteGroupId(null); },
    onError: (e) => toast.error(e.message),
  });
  const createOptionMutation = trpc.modifiers.createOption.useMutation({
    onSuccess: () => { toast.success("Option added"); utils.modifiers.listGroups.invalidate(); setOptionDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateOptionMutation = trpc.modifiers.updateOption.useMutation({
    onSuccess: () => { toast.success("Option updated"); utils.modifiers.listGroups.invalidate(); setOptionDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteOptionMutation = trpc.modifiers.deleteOption.useMutation({
    onSuccess: () => { toast.success("Option deleted"); utils.modifiers.listGroups.invalidate(); setDeleteOptionId(null); },
    onError: (e) => toast.error(e.message),
  });

  function openCreateGroup() {
    setEditingGroupId(null); setGroupName(""); setGroupRequired(false); setGroupMin("0"); setGroupMax("1");
    setGroupDialogOpen(true);
  }
  function openEditGroup(g: (typeof groups)[0]) {
    setEditingGroupId(g.id); setGroupName(g.name); setGroupRequired(g.required);
    setGroupMin(String(g.minSelect)); setGroupMax(String(g.maxSelect));
    setGroupDialogOpen(true);
  }
  function handleSaveGroup() {
    if (!groupName.trim()) return toast.error("Group name is required");
    const payload = { name: groupName.trim(), required: groupRequired, minSelect: parseInt(groupMin) || 0, maxSelect: parseInt(groupMax) || 1 };
    if (editingGroupId !== null) updateGroupMutation.mutate({ id: editingGroupId, ...payload });
    else createGroupMutation.mutate(payload);
  }

  function openCreateOption(groupId: number) {
    setOptionGroupId(groupId); setEditingOptionId(null); setOptionName(""); setOptionPrice("0"); setOptionDefault(false);
    setOptionDialogOpen(true);
  }
  function openEditOption(opt: { id: number; groupId: number; name: string; priceAdjustment: string; isDefault: boolean }) {
    setOptionGroupId(opt.groupId); setEditingOptionId(opt.id); setOptionName(opt.name);
    setOptionPrice(opt.priceAdjustment); setOptionDefault(opt.isDefault);
    setOptionDialogOpen(true);
  }
  function handleSaveOption() {
    if (!optionName.trim()) return toast.error("Option name is required");
    const payload = { name: optionName.trim(), priceAdjustment: parseFloat(optionPrice) || 0, isDefault: optionDefault };
    if (editingOptionId !== null) updateOptionMutation.mutate({ id: editingOptionId, ...payload });
    else if (optionGroupId !== null) createOptionMutation.mutate({ groupId: optionGroupId, ...payload });
  }

  const isSavingGroup = createGroupMutation.isPending || updateGroupMutation.isPending;
  const isSavingOption = createOptionMutation.isPending || updateOptionMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Modifier Groups</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{groups.length} groups</p>
        </div>
        <Button onClick={openCreateGroup} className="bg-red-700 hover:bg-red-800 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No modifier groups yet.</div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="border rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 p-4 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                {expandedGroup === group.id
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                    {" · "}
                    {group.required ? "Required" : "Optional"}
                    {" · "}
                    Select {group.minSelect}–{group.maxSelect === 0 ? "∞" : group.maxSelect}
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openCreateOption(group.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditGroup(group)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteGroupId(group.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {/* Options list */}
              {expandedGroup === group.id && (
                <div className="divide-y">
                  {group.options.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground italic">No options yet. Click + to add one.</div>
                  ) : (
                    group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{opt.name}</span>
                          {opt.isDefault && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {parseFloat(opt.priceAdjustment) === 0
                            ? "Free"
                            : `+$${parseFloat(opt.priceAdjustment).toFixed(2)}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditOption({ ...opt, groupId: group.id })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteOptionId(opt.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGroupId !== null ? "Edit Modifier Group" : "Add Modifier Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Group Name *</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Choose Crust" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Min Select</Label>
                <Input type="number" min="0" value={groupMin} onChange={(e) => setGroupMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Select</Label>
                <Input type="number" min="1" value={groupMax} onChange={(e) => setGroupMax(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={groupRequired} onCheckedChange={setGroupRequired} />
              <Label>Required selection</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGroup} disabled={isSavingGroup} className="bg-red-700 hover:bg-red-800 text-white">
              {isSavingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingGroupId !== null ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingOptionId !== null ? "Edit Option" : "Add Option"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Option Name *</Label>
              <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="e.g. Thin Crust" />
            </div>
            <div className="space-y-1.5">
              <Label>Price Adjustment ($)</Label>
              <Input type="number" step="0.01" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} placeholder="0.00" />
              <p className="text-xs text-muted-foreground">0 = free, positive = upcharge, negative = discount</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={optionDefault} onCheckedChange={setOptionDefault} />
              <Label>Pre-selected by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOption} disabled={isSavingOption} className="bg-red-700 hover:bg-red-800 text-white">
              {isSavingOption ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingOptionId !== null ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group */}
      <AlertDialog open={deleteGroupId !== null} onOpenChange={(o) => !o && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier Group?</AlertDialogTitle>
            <AlertDialogDescription>All options and item assignments for this group will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroupId !== null && deleteGroupMutation.mutate({ id: deleteGroupId })}
              className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Option */}
      <AlertDialog open={deleteOptionId !== null} onOpenChange={(o) => !o && setDeleteOptionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option?</AlertDialogTitle>
            <AlertDialogDescription>This option will be permanently removed from the group.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteOptionId !== null && deleteOptionMutation.mutate({ id: deleteOptionId })}
              className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Printer Labels Section ────────────────────────────────────────────────────

function PrinterLabelsSection() {
  const { data: items = [] } = trpc.menuItems.list.useQuery({ includeUnavailable: true });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Printer Labels</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Labels route items to the correct kitchen printer when an order is placed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRINT_LABELS.map((label) => {
          const labelItems = items.filter((i) => i.printLabel === label);
          const info = PRINT_LABEL_INFO[label];
          return (
            <div key={label} className="border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: info.color + "20" }}>
                  <Printer className="h-5 w-5" style={{ color: info.color }} />
                </div>
                <div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{labelItems.length} item{labelItems.length !== 1 ? "s" : ""}</div>
                </div>
                <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: info.color }}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
              {labelItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {labelItems.slice(0, 8).map((item) => (
                    <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">{item.name}</span>
                  ))}
                  {labelItems.length > 8 && (
                    <span className="text-xs text-muted-foreground px-2 py-0.5">+{labelItems.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">How to change a label:</strong> Go to the Item List section, click the edit icon on any item, and change the Printer Label field. The item will immediately route to the new printer on the next order.
      </div>
    </div>
  );
}

// ── Discounts Section ─────────────────────────────────────────────────────────

function DiscountsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [description, setDescription] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  type CouponRow = { id: number; code: string; discountPercent: number; description: string | null; usageCount: number; usageLimit: number | null; isActive: boolean };
  const { data: couponsRaw = [], isLoading } = trpc.coupon.list.useQuery();
  const coupons = couponsRaw as CouponRow[];

  const createMutation = trpc.coupon.create.useMutation({
    onSuccess: () => { toast.success("Coupon created"); utils.coupon.list.invalidate(); setDialogOpen(false); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggleMutation = trpc.coupon.toggle.useMutation({
    onSuccess: () => utils.coupon.list.invalidate(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  function handleCreate() {
    const pct = parseInt(discountPercent);
    if (!code.trim()) return toast.error("Code is required");
    if (isNaN(pct) || pct < 1 || pct > 100) return toast.error("Discount must be 1–100%");
    createMutation.mutate({
      code: code.trim().toUpperCase(),
      discountPercent: pct,
      description: description.trim() || undefined,
      usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Discounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setCode(""); setDiscountPercent(""); setDescription(""); setUsageLimit(""); setDialogOpen(true); }}
          className="bg-red-700 hover:bg-red-800 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Coupon
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell></TableRow>
            ) : coupons.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No coupons yet.
              </TableCell></TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-bold">{coupon.code}</code>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">{coupon.discountPercent}% off</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{coupon.description || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {coupon.usageCount} used
                      {coupon.usageLimit ? ` / ${coupon.usageLimit} limit` : " / unlimited"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleMutation.mutate({ code: coupon.code, isActive: !coupon.isActive })}>
                      {coupon.isActive
                        ? <ToggleRight className="h-5 w-5 text-green-600" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(coupon.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" />
            </div>
            <div className="space-y-1.5">
              <Label>Discount % *</Label>
              <Input type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="e.g. 20" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 20% off your order" />
            </div>
            <div className="space-y-1.5">
              <Label>Usage Limit <span className="text-xs text-muted-foreground">(leave blank for unlimited)</span></Label>
              <Input type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="e.g. 100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-red-700 hover:bg-red-800 text-white">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>This coupon will be permanently removed and can no longer be used at checkout.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              if (deleteId !== null) {
                const c = coupons.find((x: CouponRow) => x.id === deleteId);
                if (c) toggleMutation.mutate({ code: c.code, isActive: false });
                setDeleteId(null);
              }
            }} className="bg-destructive hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
