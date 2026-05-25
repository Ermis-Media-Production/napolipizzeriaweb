/**
 * Admin Menu Manager — full CRUD for menu items.
 * Features: category filter, add/edit/delete items, photo upload, availability toggle.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  ImageOff,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  ChevronDown,
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

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "pizza", label: "Pizza" },
  { value: "burger", label: "Burgers" },
  { value: "pasta", label: "Pasta" },
  { value: "salad", label: "Salads" },
  { value: "soup", label: "Soups" },
  { value: "sandwich", label: "Sandwiches" },
  { value: "wrap", label: "Wraps" },
  { value: "wings", label: "Wings" },
  { value: "appetizer", label: "Appetizers" },
  { value: "kids", label: "Kids Menu" },
  { value: "beverage", label: "Beverages" },
  { value: "dessert", label: "Desserts" },
  { value: "special", label: "Specials" },
  { value: "catering", label: "Catering" },
];

const PRINT_LABELS = ["Food", "Pizza", "Pizzeria", "Bar/Drinks"] as const;
type PrintLabel = (typeof PRINT_LABELS)[number];

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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemFormData>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadItemId, setPendingUploadItemId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: items = [], isLoading } = trpc.menuItems.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    includeUnavailable: true,
  });

  const createMutation = trpc.menuItems.create.useMutation({
    onSuccess: () => {
      toast.success("Item created successfully");
      utils.menuItems.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.menuItems.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully");
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

  const toggleMutation = trpc.menuItems.toggleAvailability.useMutation({
    onSuccess: () => utils.menuItems.list.invalidate(),
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
    // Reset input
    e.target.value = "";
  }

  function triggerPhotoUpload(itemId: number) {
    setPendingUploadItemId(itemId);
    fileInputRef.current?.click();
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Menu Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} in{" "}
              {selectedCategory === "all" ? "all categories" : selectedCategory}
            </p>
          </div>
          <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800 text-white shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                selectedCategory === cat.value
                  ? "bg-red-700 text-white border-red-700"
                  : "bg-background text-muted-foreground border-border hover:border-red-300 hover:text-red-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading items…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground text-sm">No items found. Add your first item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden transition-opacity ${
                  !item.isAvailable ? "opacity-60" : ""
                }`}
              >
                {/* Photo */}
                <div className="relative h-40 bg-muted flex items-center justify-center group">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  <button
                    onClick={() => triggerPhotoUpload(item.id)}
                    disabled={uploadingId === item.id}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium gap-2"
                  >
                    {uploadingId === item.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Change Photo
                      </>
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-foreground">${Number(item.price).toFixed(2)}</p>
                      {item.price2 && (
                        <p className="text-xs text-muted-foreground">
                          {item.price2Label ?? "Alt"}: ${Number(item.price2).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs py-0 px-1.5">
                      {item.printLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Sort: {item.sortOrder}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })
                      }
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.isAvailable ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                      {item.isAvailable ? "Available" : "Hidden"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for photo upload */}
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
                    {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
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
