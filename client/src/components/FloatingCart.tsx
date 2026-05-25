/**
 * FloatingCart — sticky bottom-right cart bubble visible on all pages.
 * Shows item count badge and total price. Clicking opens the cart drawer.
 */
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function FloatingCart() {
  const { totalItems, totalPrice, openCart } = useCart();

  if (totalItems === 0) return null;

  return (
    <>
      <button
        onClick={openCart}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full shadow-2xl transition-all active:scale-95"
        style={{
          background: "var(--napoli-red)",
          color: "white",
          boxShadow: "0 8px 32px rgba(180,20,20,0.45)",
          animation: "float-in 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        aria-label={`View cart — ${totalItems} item${totalItems > 1 ? "s" : ""}`}
      >
        <div className="relative">
          <ShoppingCart size={20} />
          <span
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--napoli-gold)", color: "var(--napoli-dark)", fontFamily: "'Oswald', sans-serif" }}
          >
            {totalItems > 9 ? "9+" : totalItems}
          </span>
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-xs opacity-80" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            {totalItems} item{totalItems > 1 ? "s" : ""}
          </span>
          <span className="text-sm font-bold napoli-price">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </button>

      <style>{`
        @keyframes float-in {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
