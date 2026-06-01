/**
 * Admin Settings Panel — /admin/settings
 *
 * Allows admins to configure store-level settings:
 * - Convenience Fee: enable/disable toggle + percentage input
 *
 * Changes are persisted in the storeSettings DB table and take
 * effect immediately for all new cart sessions.
 */
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, ToggleLeft, ToggleRight, Percent, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {

  // ── Store Hours ──────────────────────────────────────────────────────────────
  const { data: storeHours, isLoading: hoursLoading, refetch: refetchHours } = trpc.settings.getStoreHours.useQuery();
  const [forceOpen, setForceOpen] = useState(false);
  const [hoursDirty, setHoursDirty] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  useEffect(() => {
    if (storeHours) {
      setForceOpen(storeHours.forceOpen);
      setHoursDirty(false);
    }
  }, [storeHours]);

  const updateHours = trpc.settings.updateStoreHours.useMutation({
    onSuccess: (data) => {
      setForceOpen(data.forceOpen);
      setHoursDirty(false);
      setHoursSaved(true);
      toast.success(data.forceOpen ? "Store is now FORCE OPEN — orders accepted 24/7." : "Store returned to normal hours (10 AM – 10 PM).");
      refetchHours();
      setTimeout(() => setHoursSaved(false), 4000);
    },
    onError: (err) => toast.error("Failed to update store hours: " + err.message),
  });

  const handleForceOpenToggle = () => {
    const next = !forceOpen;
    setForceOpen(next);
    setHoursDirty(true);
    setHoursSaved(false);
  };

  const handleHoursSave = () => {
    updateHours.mutate({ forceOpen });
  };

  // Fetch current settings
  const { data: feeConfig, isLoading, refetch } = trpc.settings.getConvenienceFee.useQuery();

  // Local state for the form
  const [feeEnabled, setFeeEnabled] = useState<boolean>(true);
  const [feePercent, setFeePercent] = useState<string>("3");
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form state when data loads
  useEffect(() => {
    if (feeConfig) {
      setFeeEnabled(feeConfig.enabled);
      setFeePercent(String(feeConfig.percent));
      setIsDirty(false);
    }
  }, [feeConfig]);

  const updateFee = trpc.settings.updateConvenienceFee.useMutation({
    onSuccess: (data) => {
      setFeeEnabled(data.enabled);
      setFeePercent(String(data.percent));
      setIsDirty(false);
      setSaveSuccess(true);
      toast.success("Settings saved successfully.");
      refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      toast.error("Failed to save settings: " + err.message);
    },
  });

  const handleToggle = () => {
    setFeeEnabled((prev) => !prev);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handlePercentChange = (val: string) => {
    // Allow only numbers and one decimal point
    const cleaned = val.replace(/[^0-9.]/g, "");
    setFeePercent(cleaned);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    const parsed = parseFloat(feePercent);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Please enter a valid percentage between 0 and 100.");
      return;
    }
    updateFee.mutate({ enabled: feeEnabled, percent: parsed });
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Runtime configuration for the store.</p>
        </div>

        {/* ── Convenience Fee Card ── */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
        >
          {/* Card header */}
          <div
            className="px-5 py-4 border-b flex items-center gap-3"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.008 80)" }}
          >
            <Percent size={16} style={{ color: "var(--napoli-red, #c0392b)" }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                CONVENIENCE FEE
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Applied to the food subtotal (after any coupon discount). Shown as a separate line item at checkout.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 py-5 space-y-5">
            {isLoading ? (
              <div className="flex items-center gap-2 py-4">
                <RefreshCw size={16} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
                <span className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                  Loading settings…
                </span>
              </div>
            ) : (
              <>
                {/* Enable / Disable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      Enable Convenience Fee
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      When disabled, no convenience fee is charged at checkout.
                    </p>
                  </div>
                  <button
                    onClick={handleToggle}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all active:scale-95"
                    style={{
                      background: feeEnabled ? "oklch(0.96 0.06 145)" : "oklch(0.96 0.02 30)",
                      borderColor: feeEnabled ? "oklch(0.70 0.15 145)" : "oklch(0.80 0.04 30)",
                      color: feeEnabled ? "oklch(0.30 0.12 145)" : "oklch(0.50 0.04 30)",
                    }}
                  >
                    {feeEnabled ? (
                      <>
                        <ToggleRight size={20} />
                        <span className="text-xs font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>ON</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={20} />
                        <span className="text-xs font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>OFF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Percentage input */}
                <div
                  className="space-y-2"
                  style={{ opacity: feeEnabled ? 1 : 0.45, pointerEvents: feeEnabled ? "auto" : "none" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                    Fee Percentage
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={feePercent}
                        onChange={(e) => handlePercentChange(e.target.value)}
                        className="w-28 text-sm px-3 py-2 pr-8 rounded border outline-none focus:ring-2"
                        style={{
                          borderColor: "oklch(0.82 0.015 80)",
                          fontFamily: "'Lato', sans-serif",
                          color: "oklch(0.25 0.04 30)",
                        }}
                      />
                      <span
                        className="absolute right-3 text-sm font-bold"
                        style={{ color: "oklch(0.50 0.04 30)", fontFamily: "'Oswald', sans-serif" }}
                      >
                        %
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      Enter a value between 0 and 100. Current DB value:{" "}
                      <strong style={{ color: "oklch(0.35 0.04 30)" }}>{feeConfig?.percent ?? "—"}%</strong>
                    </p>
                  </div>
                </div>

                {/* Live preview */}
                <div
                  className="p-3 rounded-lg border"
                  style={{ borderColor: "oklch(0.88 0.015 80)", background: "oklch(0.98 0.005 80)" }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.45 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                    PREVIEW — $20.00 ORDER
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs" style={{ color: "oklch(0.50 0.03 30)" }}>
                      <span>Subtotal</span><span>$20.00</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: feeEnabled ? "oklch(0.35 0.04 30)" : "oklch(0.65 0.03 30)" }}>
                      <span>Convenience Fee ({feeEnabled ? (parseFloat(feePercent) || 0).toFixed(1) : "0"}%)</span>
                      <span>+${feeEnabled ? ((parseFloat(feePercent) || 0) * 0.20).toFixed(2) : "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "oklch(0.35 0.04 30)" }}>
                      <span>Sales Tax (NV 8.375%)</span><span>+$1.68</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", color: "var(--napoli-red, #c0392b)" }}>
                      <span style={{ fontFamily: "'Oswald', sans-serif" }}>Total</span>
                      <span style={{ fontFamily: "'Oswald', sans-serif" }}>
                        ${(20 + (feeEnabled ? (parseFloat(feePercent) || 0) * 0.20 : 0) + 1.675).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || updateFee.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
                    style={{
                      background: !isDirty || updateFee.isPending ? "oklch(0.80 0.015 80)" : "var(--napoli-red, #c0392b)",
                      color: "white",
                      fontFamily: "'Oswald', sans-serif",
                      letterSpacing: "0.04em",
                      cursor: !isDirty || updateFee.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {updateFee.isPending ? (
                      <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                    ) : saveSuccess ? (
                      <><CheckCircle2 size={14} /> Saved!</>
                    ) : (
                      <><Save size={14} /> Save Changes</>
                    )}
                  </button>
                  {isDirty && !updateFee.isPending && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.55 0.10 60)", fontFamily: "'Lato', sans-serif" }}>
                      <AlertCircle size={12} />
                      Unsaved changes
                    </span>
                  )}
                  {saveSuccess && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.38 0.12 145)", fontFamily: "'Lato', sans-serif" }}>
                      <CheckCircle2 size={12} />
                      Changes applied to all new orders
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Store Hours Card ── */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "white", borderColor: forceOpen ? "oklch(0.70 0.15 145)" : "oklch(0.88 0.015 80)" }}
        >
          <div
            className="px-5 py-4 border-b flex items-center gap-3"
            style={{
              borderColor: forceOpen ? "oklch(0.70 0.15 145)" : "oklch(0.88 0.015 80)",
              background: forceOpen ? "oklch(0.96 0.06 145)" : "oklch(0.98 0.008 80)",
            }}
          >
            <Clock size={16} style={{ color: forceOpen ? "oklch(0.38 0.12 145)" : "var(--napoli-red, #c0392b)" }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                STORE HOURS &amp; ORDERING
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Normal hours: 10:00 AM – 10:00 PM (Las Vegas time). Use Force Open to accept orders outside these hours.
              </p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-5">
            {hoursLoading ? (
              <div className="flex items-center gap-2 py-4">
                <RefreshCw size={16} className="animate-spin" style={{ color: "var(--napoli-red, #c0392b)" }} />
                <span className="text-sm" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Loading…</span>
              </div>
            ) : (
              <>
                {/* Force Open toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.30 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      Force Open (Override Hours)
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                      When ON, the store accepts orders at any time regardless of the normal 10 AM–10 PM schedule.
                    </p>
                  </div>
                  <button
                    onClick={handleForceOpenToggle}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all active:scale-95"
                    style={{
                      background: forceOpen ? "oklch(0.96 0.06 145)" : "oklch(0.96 0.02 30)",
                      borderColor: forceOpen ? "oklch(0.70 0.15 145)" : "oklch(0.80 0.04 30)",
                      color: forceOpen ? "oklch(0.30 0.12 145)" : "oklch(0.50 0.04 30)",
                    }}
                  >
                    {forceOpen ? (
                      <><ToggleRight size={20} /><span className="text-xs font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>OPEN</span></>
                    ) : (
                      <><ToggleLeft size={20} /><span className="text-xs font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>NORMAL</span></>
                    )}
                  </button>
                </div>

                {/* Status banner */}
                {forceOpen && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg border"
                    style={{ background: "oklch(0.96 0.06 145)", borderColor: "oklch(0.70 0.15 145)" }}
                  >
                    <CheckCircle2 size={14} style={{ color: "oklch(0.38 0.12 145)" }} />
                    <p className="text-xs font-semibold" style={{ color: "oklch(0.30 0.12 145)", fontFamily: "'Lato', sans-serif" }}>
                      Force Open is ACTIVE — the store is accepting orders right now regardless of the time.
                    </p>
                  </div>
                )}

                {/* Save button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleHoursSave}
                    disabled={!hoursDirty || updateHours.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
                    style={{
                      background: !hoursDirty || updateHours.isPending ? "oklch(0.80 0.015 80)" : "var(--napoli-red, #c0392b)",
                      color: "white",
                      fontFamily: "'Oswald', sans-serif",
                      letterSpacing: "0.04em",
                      cursor: !hoursDirty || updateHours.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {updateHours.isPending ? (
                      <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                    ) : hoursSaved ? (
                      <><CheckCircle2 size={14} /> Saved!</>
                    ) : (
                      <><Save size={14} /> Save Changes</>
                    )}
                  </button>
                  {hoursDirty && !updateHours.isPending && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.55 0.10 60)", fontFamily: "'Lato', sans-serif" }}>
                      <AlertCircle size={12} /> Unsaved changes
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Info note ── */}
        <div
          className="flex items-start gap-3 p-4 rounded-lg border"
          style={{ borderColor: "oklch(0.78 0.10 250)", background: "oklch(0.97 0.03 250)" }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "oklch(0.45 0.12 250)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.40 0.08 250)", fontFamily: "'Lato', sans-serif" }}>
            Settings take effect immediately for all new checkout sessions. Changes apply to all new Authorize.net transactions.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
