import { useCart } from "@/contexts/CartContext";
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error("Could not start checkout: " + err.message);
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) return;
    createCheckout.mutate({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
      })),
      successUrl: `${window.location.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/menu`,
      orderType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeCart}
          style={{ transition: "opacity 200ms ease-out" }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: "min(420px, 100vw)",
          background: "var(--napoli-cream, #faf8f3)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ background: "var(--napoli-red, #c0392b)", borderColor: "oklch(0.35 0.18 27)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-white" />
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Your Order
            </h2>
            {totalItems > 0 && (
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--napoli-gold, #f5a623)", color: "#1a0a00" }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
            aria-label="Close cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingCart size={48} style={{ color: "oklch(0.70 0.03 30)" }} />
              <div>
                <p className="font-semibold text-base" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                  Your cart is empty
                </p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.03 30)" }}>
                  Add items from the menu to get started
                </p>
              </div>
              <button
                onClick={closeCart}
                className="text-sm font-semibold px-5 py-2 rounded"
                style={{ background: "var(--napoli-red, #c0392b)", color: "white", fontFamily: "'Oswald', sans-serif" }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                  style={{ background: "white", borderColor: "oklch(0.88 0.015 80)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight" style={{ color: "oklch(0.22 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "oklch(0.55 0.03 30)" }}>
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm font-bold mt-1" style={{ color: "var(--napoli-red, #c0392b)" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                      style={{ borderColor: "oklch(0.82 0.015 80)" }}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold" style={{ color: "oklch(0.22 0.04 30)" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors hover:bg-red-50"
                      style={{ borderColor: "oklch(0.82 0.015 80)" }}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center ml-1 transition-colors hover:bg-red-100"
                      style={{ color: "var(--napoli-red, #c0392b)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Clear cart */}
              <button
                onClick={clearCart}
                className="text-xs w-full text-center py-1.5 transition-colors"
                style={{ color: "oklch(0.55 0.03 30)" }}
              >
                Clear all items
              </button>
            </div>
          )}
        </div>

        {/* Checkout panel */}
        {items.length > 0 && (
          <div
            className="border-t px-4 py-4 space-y-3"
            style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}
          >
            {/* Order type */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.42 0.03 30)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }}>
                ORDER TYPE
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["pickup", "delivery", "dine-in"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className="py-2 rounded text-xs font-semibold capitalize border transition-all"
                    style={{
                      background: orderType === type ? "var(--napoli-red, #c0392b)" : "transparent",
                      color: orderType === type ? "white" : "oklch(0.42 0.03 30)",
                      borderColor: orderType === type ? "var(--napoli-red, #c0392b)" : "oklch(0.82 0.015 80)",
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs px-3 py-2 rounded border outline-none focus:ring-1"
                style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif" }}
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: "oklch(0.88 0.015 80)" }}>
              <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.04 30)", fontFamily: "'Oswald', sans-serif" }}>
                Total ({totalItems} items)
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--napoli-red, #c0392b)", fontFamily: "'Oswald', sans-serif" }}>
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={createCheckout.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: createCheckout.isPending ? "oklch(0.55 0.03 30)" : "var(--napoli-red, #c0392b)",
                color: "white",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {createCheckout.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Redirecting to Payment...
                </>
              ) : (
                <>
                  Pay with Card
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 30)" }}>
              Secured by Stripe · Taxes not included
            </p>
          </div>
        )}
      </div>
    </>
  );
}
