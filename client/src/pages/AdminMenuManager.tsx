/**
 * Admin Menu Manager — compact list view grouped by category.
 * Features:
 *  - Items shown as compact rows: small photo, ID, name, price, printer label, availability toggle, edit/delete
 *  - Categories shown as collapsible accordion sections with a category-level enable/disable toggle
 *  - Add/Edit dialog with full item fields
 *  - Photo upload per item
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  ImageOff,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const PRINT_LABELS = ["Food", "Pizza", "Pizzeria", "Bar/Drinks"] as const;
type PrintLabel = (typeof PRINT_LABELS)[number];

const PRINT_LABEL_COLORS: Record<PrintLabel, string> = {
  Food: "bg-orange-100 text-orange-700 border-orange-200",
  Pizza: "bg-red-100 text-red-700 border-red-200",
  Pizzeria: "bg-purple-100 text-purple-700 border-purple-200",
  "Bar/Drinks": "bg-blue-100 text-blue-700 border-blue-200",
};

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

const DEFAULT_FORM: ItemFormData = {
  name: "",
  category: "pizza",
  description: "",
  price: "",
  price2: "",
  price2Label: "",
  printLabel: "Food",
  isAvailable: true,
  sortOrder: "0",
};

export default function AdminMenuManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemFormData>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadItemId, setPendingUploadItemId] = useState<number | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();

  const { data: items = [], isLoading: itemsLoading } = trpc.menuItems.list.useQuery({
    includeUnavailable: true,
  });

  const { data: categories = [], isLoading: catsLoading } = trpc.itemCategories.list.useQuery();

  const isLoading = itemsLoading || catsLoading;

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const filtered = searchQuery.trim()
      ? items.filter(
          (it) =>
            it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(it.id).includes(searchQuery)
        )
      : items;

    const map = new Map<string, typeof items>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items, searchQuery]);

  // Ordered categories (from DB, then any extra slugs found in items)
  const orderedCategories = useMemo(() => {
    const dbSlugs = new Set(categories.map((c) => c.slug));
    const extraSlugs = Array.from(itemsByCategory.keys()).filter((s) => !dbSlugs.has(s));
    return [
      ...categories,
      ...extraSlugs.map((s) => ({
        id: -1,
        slug: s,
        name: s.charAt(0).toUpperCase() + s.slice(1),
        color: "#6b7280",
        hidden: false,
        sortOrder: 999,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    ].filter((c) => itemsByCategory.has(c.slug));
  }, [categories, itemsByCategory]);

  // Mutations
  const createMutation = trpc.menuItems.create.useMutation({
    onSuccess: () => {
      toast.success("Item created");
      utils.menuItems.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.menuItems.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      utils.menuItems.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.menuItems.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      utils.menuItems.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleItemMutation = trpc.menuItems.toggleAvailability.useMutation({
    onSuccess: () => utils.menuItems.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const toggleCategoryMutation = trpc.itemCategories.toggleHidden.useMutation({
    onSuccess: (updated) => {
      toast.success(
        updated.hidden
          ? `"${updated.name}" category hidden from menu`
          : `"${updated.name}" category visible on menu`
      );
      utils.itemCategories.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadPhotoMutation = trpc.menuItems.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo updated");
      utils.menuItems.list.invalidate();
      setUploadingId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setUploadingId(null);
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: (typeof items)[0]) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      price: item.price,
      price2: item.price2 ?? "",
      price2Label: item.price2Label ?? "",
      printLabel: (item.printLabel as PrintLabel) ?? "Food",
      isAvailable: item.isAvailable,
      sortOrder: String(item.sortOrder),
    });
    setDialogOpen(true);
  }

  function handleSave() {
    const price = parseFloat(form.price);
    if (!form.name.trim()) return toast.error("Name is required");
    if (isNaN(price) || price < 0) return toast.error("Valid price is required");

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      price,
      price2: form.price2 ? parseFloat(form.price2) : undefined,
      price2Label: form.price2Label.trim() || undefined,
      printLabel: form.printLabel,
      isAvailable: form.isAvailable,
      sortOrder: parseInt(form.sortOrder) || 0,
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || pendingUploadItemId === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";
      setUploadingId(pendingUploadItemId);
      uploadPhotoMutation.mutate({
        itemId: pendingUploadItemId,
        base64Data: base64,
        mimeType,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function triggerPhotoUpload(itemId: number) {
    setPendingUploadItemId(itemId);
    fileInputRef.current?.click();
  }

  function toggleCollapse(slug: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const totalItems = items.length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Menu Manager</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalItems} item{totalItems !== 1 ? "s" : ""} across {orderedCategories.length} categories
            </p>
          </div>
          <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800 text-white shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name or ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        {/* Category accordion list */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : orderedCategories.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground text-sm">No items found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedCategories.map((cat) => {
              const catItems = itemsByCategory.get(cat.slug) ?? [];
              const isCollapsed = collapsedCategories.has(cat.slug);
              const isHidden = cat.hidden;
              const availableCount = catItems.filter((i) => i.isAvailable).length;

              return (
                <div
                  key={cat.slug}
                  className={`rounded-xl border bg-card overflow-hidden transition-opacity ${isHidden ? "opacity-60" : ""}`}
                >
                  {/* Category header row */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/50">
                    {/* Collapse toggle */}
                    <button
                      onClick={() => toggleCollapse(cat.slug)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Color dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />

                    {/* Category name */}
                    <span className="font-semibold text-sm text-foreground flex-1">
                      {cat.name}
                    </span>

                    {/* Stats */}
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {availableCount}/{catItems.length} active
                    </span>

                    {/* Category visibility toggle */}
                    {cat.id !== -1 && (
                      <button
                        onClick={() =>
                          toggleCategoryMutation.mutate({ id: cat.id, hidden: !isHidden })
                        }
                        disabled={toggleCategoryMutation.isPending}
                        title={isHidden ? "Show category on menu" : "Hide entire category from menu"}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          isHidden
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        }`}
                      >
                        {toggleCategoryMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isHidden ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {isHidden ? "Hidden" : "Visible"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Items list */}
                  {!isCollapsed && (
                    <div className="divide-y divide-border/40">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${
                            !item.isAvailable ? "opacity-50" : ""
                          }`}
                        >
                          {/* Small photo */}
                          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 group cursor-pointer"
                               onClick={() => triggerPhotoUpload(item.id)}>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                            {/* Upload overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              {uploadingId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5 text-white" />
                              )}
                            </div>
                          </div>

                          {/* ID */}
                          <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                            #{item.id}
                          </span>

                          {/* Name + price */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate leading-tight">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">
                              ${Number(item.price).toFixed(2)}
                              {item.price2 && (
                                <span className="ml-1 text-muted-foreground/60">
                                  / {item.price2Label ?? "Alt"}: ${Number(item.price2).toFixed(2)}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Printer label badge */}
                          <span
                            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border shrink-0 ${
                              PRINT_LABEL_COLORS[item.printLabel as PrintLabel] ??
                              "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {item.printLabel}
                          </span>

                          {/* Item availability toggle */}
                          <button
                            onClick={() =>
                              toggleItemMutation.mutate({
                                id: item.id,
                                isAvailable: !item.isAvailable,
                              })
                            }
                            title={item.isAvailable ? "Click to hide item" : "Click to show item"}
                            className={`shrink-0 w-8 h-5 rounded-full transition-colors relative ${
                              item.isAvailable ? "bg-green-500" : "bg-muted-foreground/30"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                item.isAvailable ? "left-3.5" : "left-0.5"
                              }`}
                            />
                          </button>

                          {/* Edit / Delete */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                              title="Edit item"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoFileChange}
        />

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId !== null ? "Edit Item" : "Add New Item"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="item-name">Name *</Label>
                <Input
                  id="item-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Margherita Pizza"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea
                  id="item-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description shown on the menu"
                  rows={2}
                />
              </div>

              {/* Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item-price">Price ($) *</Label>
                  <Input
                    id="item-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item-price2">Alt Price ($)</Label>
                  <Input
                    id="item-price2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price2}
                    onChange={(e) => setForm((f) => ({ ...f, price2: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Alt price label */}
              {form.price2 && (
                <div className="space-y-1.5">
                  <Label htmlFor="item-price2label">Alt Price Label</Label>
                  <Input
                    id="item-price2label"
                    value={form.price2Label}
                    onChange={(e) => setForm((f) => ({ ...f, price2Label: e.target.value }))}
                    placeholder='e.g. "Large" or "1 lb"'
                  />
                </div>
              )}

              {/* Print label */}
              <div className="space-y-1.5">
                <Label>Print Label (Clover)</Label>
                <Select
                  value={form.printLabel}
                  onValueChange={(v) => setForm((f) => ({ ...f, printLabel: v as PrintLabel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRINT_LABELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort order */}
              <div className="space-y-1.5">
                <Label htmlFor="item-sort">Sort Order</Label>
                <Input
                  id="item-sort"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Available toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Available for ordering</p>
                  <p className="text-xs text-muted-foreground">
                    Hidden items won't appear on the public menu
                  </p>
                </div>
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingId !== null ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete menu item?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The item will be permanently removed from the menu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
