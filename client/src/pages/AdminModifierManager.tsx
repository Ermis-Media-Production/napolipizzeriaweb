/**
 * Admin Modifier Manager — create/edit modifier groups and options,
 * then assign them to menu items by category.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Link2,
  Link2Off,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ────────────────────────────────────────────────────────────────────

interface GroupFormData {
  name: string;
  required: boolean;
  minSelect: string;
  maxSelect: string;
  sortOrder: string;
}

interface OptionFormData {
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
  sortOrder: string;
}

const DEFAULT_GROUP: GroupFormData = {
  name: "",
  required: false,
  minSelect: "0",
  maxSelect: "1",
  sortOrder: "0",
};

const DEFAULT_OPTION: OptionFormData = {
  name: "",
  priceAdjustment: "0",
  isDefault: false,
  sortOrder: "0",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminModifierManager() {
  const utils = trpc.useUtils();

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormData>(DEFAULT_GROUP);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  // Option dialog state
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [optionGroupId, setOptionGroupId] = useState<number | null>(null);
  const [optionForm, setOptionForm] = useState<OptionFormData>(DEFAULT_OPTION);
  const [deleteOptionId, setDeleteOptionId] = useState<number | null>(null);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignGroupId, setAssignGroupId] = useState<number | null>(null);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: groups = [], isLoading } = trpc.modifiers.listGroups.useQuery();
  const { data: allItems = [] } = trpc.menuItems.list.useQuery({ includeUnavailable: true });

  // ── Group mutations ────────────────────────────────────────────────────────

  const createGroupMutation = trpc.modifiers.createGroup.useMutation({
    onSuccess: () => {
      toast.success("Modifier group created");
      utils.modifiers.listGroups.invalidate();
      setGroupDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateGroupMutation = trpc.modifiers.updateGroup.useMutation({
    onSuccess: () => {
      toast.success("Modifier group updated");
      utils.modifiers.listGroups.invalidate();
      setGroupDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroupMutation = trpc.modifiers.deleteGroup.useMutation({
    onSuccess: () => {
      toast.success("Modifier group deleted");
      utils.modifiers.listGroups.invalidate();
      setDeleteGroupId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Option mutations ───────────────────────────────────────────────────────

  const createOptionMutation = trpc.modifiers.createOption.useMutation({
    onSuccess: () => {
      toast.success("Option added");
      utils.modifiers.listGroups.invalidate();
      setOptionDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOptionMutation = trpc.modifiers.updateOption.useMutation({
    onSuccess: () => {
      toast.success("Option updated");
      utils.modifiers.listGroups.invalidate();
      setOptionDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOptionMutation = trpc.modifiers.deleteOption.useMutation({
    onSuccess: () => {
      toast.success("Option deleted");
      utils.modifiers.listGroups.invalidate();
      setDeleteOptionId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Assignment mutations ───────────────────────────────────────────────────

  const assignMutation = trpc.modifiers.assignGroupToItem.useMutation({
    onSuccess: () => utils.modifiers.listGroups.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const unassignMutation = trpc.modifiers.unassignGroupFromItem.useMutation({
    onSuccess: () => utils.modifiers.listGroups.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openCreateGroup() {
    setEditingGroupId(null);
    setGroupForm(DEFAULT_GROUP);
    setGroupDialogOpen(true);
  }

  function openEditGroup(g: (typeof groups)[0]) {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name,
      required: g.required,
      minSelect: String(g.minSelect),
      maxSelect: String(g.maxSelect),
      sortOrder: String(g.sortOrder),
    });
    setGroupDialogOpen(true);
  }

  function handleSaveGroup() {
    if (!groupForm.name.trim()) return toast.error("Group name is required");
    const payload = {
      name: groupForm.name.trim(),
      required: groupForm.required,
      minSelect: parseInt(groupForm.minSelect) || 0,
      maxSelect: parseInt(groupForm.maxSelect) || 1,
      sortOrder: parseInt(groupForm.sortOrder) || 0,
    };
    if (editingGroupId !== null) {
      updateGroupMutation.mutate({ id: editingGroupId, ...payload });
    } else {
      createGroupMutation.mutate(payload);
    }
  }

  function openCreateOption(groupId: number) {
    setEditingOptionId(null);
    setOptionGroupId(groupId);
    setOptionForm(DEFAULT_OPTION);
    setOptionDialogOpen(true);
  }

  function openEditOption(opt: { id: number; name: string; priceAdjustment: string; isDefault: boolean; sortOrder: number }, groupId: number) {
    setEditingOptionId(opt.id);
    setOptionGroupId(groupId);
    setOptionForm({
      name: opt.name,
      priceAdjustment: opt.priceAdjustment,
      isDefault: opt.isDefault,
      sortOrder: String(opt.sortOrder),
    });
    setOptionDialogOpen(true);
  }

  function handleSaveOption() {
    if (!optionForm.name.trim()) return toast.error("Option name is required");
    const payload = {
      name: optionForm.name.trim(),
      priceAdjustment: parseFloat(optionForm.priceAdjustment) || 0,
      isDefault: optionForm.isDefault,
      sortOrder: parseInt(optionForm.sortOrder) || 0,
    };
    if (editingOptionId !== null) {
      updateOptionMutation.mutate({ id: editingOptionId, ...payload });
    } else if (optionGroupId !== null) {
      createOptionMutation.mutate({ groupId: optionGroupId, ...payload });
    }
  }

  function toggleExpand(id: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Assign dialog ──────────────────────────────────────────────────────────

  function openAssignDialog(groupId: number) {
    setAssignGroupId(groupId);
    setAssignDialogOpen(true);
  }

  const assignGroup = groups.find((g) => g.id === assignGroupId);

  // Items that have this group assigned — we need to query per item
  // We'll use listItemsForGroup
  const { data: assignedItems = [] } = trpc.modifiers.listItemsForGroup.useQuery(
    { groupId: assignGroupId ?? 0 },
    { enabled: assignGroupId !== null }
  );

  const assignedItemIds = new Set(assignedItems.map((a) => a.itemId));

  // ── Render ─────────────────────────────────────────────────────────────────

  const isSavingGroup = createGroupMutation.isPending || updateGroupMutation.isPending;
  const isSavingOption = createOptionMutation.isPending || updateOptionMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Modifiers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create modifier groups, add options, and assign them to menu items.
            </p>
          </div>
          <Button
            onClick={openCreateGroup}
            className="bg-red-700 hover:bg-red-800 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        {/* Groups list */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading modifier groups…</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No modifier groups yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <div key={group.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleExpand(group.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-foreground">{group.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {group.required && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Required
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Min {group.minSelect} / Max {group.maxSelect}
                      </span>
                      <button
                        onClick={() => openAssignDialog(group.id)}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-blue-600"
                        title="Assign to items"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEditGroup(group)}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteGroupId(group.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 py-3 space-y-2 bg-muted/20">
                      {group.options.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">
                          No options yet. Add the first one.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {group.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-background border px-3 py-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {opt.isDefault && (
                                  <Badge variant="outline" className="text-xs py-0 px-1">
                                    Default
                                  </Badge>
                                )}
                                <span className="text-sm text-foreground">{opt.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-medium text-foreground">
                                  {parseFloat(opt.priceAdjustment) > 0
                                    ? `+$${parseFloat(opt.priceAdjustment).toFixed(2)}`
                                    : parseFloat(opt.priceAdjustment) < 0
                                    ? `-$${Math.abs(parseFloat(opt.priceAdjustment)).toFixed(2)}`
                                    : "Free"}
                                </span>
                                <button
                                  onClick={() => openEditOption(opt, group.id)}
                                  className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setDeleteOptionId(opt.id)}
                                  className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateOption(group.id)}
                        className="mt-1"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Group Dialog ── */}
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingGroupId !== null ? "Edit Modifier Group" : "New Modifier Group"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Group Name *</Label>
                <Input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. "Choose Crust" or "Add Toppings"'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Selections</Label>
                  <Input
                    type="number"
                    min="0"
                    value={groupForm.minSelect}
                    onChange={(e) => setGroupForm((f) => ({ ...f, minSelect: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Selections</Label>
                  <Input
                    type="number"
                    min="1"
                    value={groupForm.maxSelect}
                    onChange={(e) => setGroupForm((f) => ({ ...f, maxSelect: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={groupForm.sortOrder}
                  onChange={(e) => setGroupForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Required selection</p>
                  <p className="text-xs text-muted-foreground">
                    Customer must choose at least one option
                  </p>
                </div>
                <Switch
                  checked={groupForm.required}
                  onCheckedChange={(v) => setGroupForm((f) => ({ ...f, required: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveGroup}
                disabled={isSavingGroup}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                {isSavingGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingGroupId !== null ? "Save Changes" : "Create Group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Option Dialog ── */}
        <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOptionId !== null ? "Edit Option" : "Add Option"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Option Name *</Label>
                <Input
                  value={optionForm.name}
                  onChange={(e) => setOptionForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. "Thin Crust" or "Extra Cheese"'
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price Adjustment ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={optionForm.priceAdjustment}
                  onChange={(e) =>
                    setOptionForm((f) => ({ ...f, priceAdjustment: e.target.value }))
                  }
                  placeholder="0.00 (free), 1.50 (upcharge), -0.50 (discount)"
                />
                <p className="text-xs text-muted-foreground">
                  Positive = upcharge, negative = discount, 0 = free
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={optionForm.sortOrder}
                  onChange={(e) => setOptionForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Pre-selected by default</p>
                  <p className="text-xs text-muted-foreground">
                    This option will be selected automatically
                  </p>
                </div>
                <Switch
                  checked={optionForm.isDefault}
                  onCheckedChange={(v) => setOptionForm((f) => ({ ...f, isDefault: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveOption}
                disabled={isSavingOption}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                {isSavingOption ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingOptionId !== null ? "Save Changes" : "Add Option"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Assign Dialog ── */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Assign "{assignGroup?.name}" to Menu Items
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-4">
                Toggle items to assign or remove this modifier group. Changes are saved immediately.
              </p>
              {allItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No menu items found.</p>
              ) : (
                <div className="space-y-1.5">
                  {allItems.map((item) => {
                    const isAssigned = assignedItemIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (!assignGroupId) return;
                            if (isAssigned) {
                              unassignMutation.mutate({ itemId: item.id, groupId: assignGroupId });
                            } else {
                              assignMutation.mutate({ itemId: item.id, groupId: assignGroupId });
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                            isAssigned
                              ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                              : "bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-700"
                          }`}
                        >
                          {isAssigned ? (
                            <>
                              <Check className="h-3 w-3" />
                              Assigned
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Assign
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Group Confirmation ── */}
        <AlertDialog
          open={deleteGroupId !== null}
          onOpenChange={(o) => !o && setDeleteGroupId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete modifier group?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the group, all its options, and all item assignments.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteGroupId !== null && deleteGroupMutation.mutate({ id: deleteGroupId })
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteGroupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Delete Option Confirmation ── */}
        <AlertDialog
          open={deleteOptionId !== null}
          onOpenChange={(o) => !o && setDeleteOptionId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete option?</AlertDialogTitle>
              <AlertDialogDescription>
                This option will be permanently removed from the modifier group.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteOptionId !== null && deleteOptionMutation.mutate({ id: deleteOptionId })
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteOptionMutation.isPending ? (
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
