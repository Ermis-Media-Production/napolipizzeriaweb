/**
 * cloverSync.test.ts
 *
 * Tests unitarios para la lógica de ruteo de impresoras de cocina.
 * getPrinterLabel() es una función pura — no requiere mocks ni credenciales.
 *
 * Impresoras:
 *   Pizza     → pizzas, calzone, stromboli, sicilian, half & half, etc.
 *   Pizzeria  → postres y bebidas (desserts, sodas, wine, beer, etc.)
 *   Food      → todo lo demás (wings, burgers, pasta, salads, sides, etc.)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPrinterLabel, verifyPrintStatus } from "./cloverSync";

// ── Mocks para verifyPrintStatus ──────────────────────────────────────────────

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-123",
    jwtSecret: "test-secret",
    oauthServerUrl: "https://oauth.test",
    builtInForgeApiUrl: "https://forge.test",
    builtInForgeApiKey: "forge-key",
    forgeApiUrl: "https://forge.test",
    forgeApiKey: "forge-key",
  },
  CLOVER_ENV: {
    apiToken: "test-clover-token",
    merchantId: "test-merchant-id",
    baseUrl: "https://api.clover.com",
  },
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import axios from "axios";
import { notifyOwner } from "./_core/notification";
const mockGet = vi.mocked(axios.get);
const mockNotify = vi.mocked(notifyOwner);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Impresora Pizza ───────────────────────────────────────────────────────────
describe("getPrinterLabel → Pizza printer", () => {
  it('rutea "Pepperoni Pizza 16\\"" a Pizza', () => {
    expect(getPrinterLabel('Pepperoni Pizza 16"')).toBe("Pizza");
  });

  it('rutea "Margherita Pizza" a Pizza', () => {
    expect(getPrinterLabel("Margherita Pizza")).toBe("Pizza");
  });

  it('rutea "Calzone Especial" a Pizza', () => {
    expect(getPrinterLabel("Calzone Especial")).toBe("Pizza");
  });

  it('rutea "Stromboli de Carne" a Pizza', () => {
    expect(getPrinterLabel("Stromboli de Carne")).toBe("Pizza");
  });

  it('rutea "Chicago Deep Dish" a Pizza', () => {
    expect(getPrinterLabel("Chicago Deep Dish")).toBe("Pizza");
  });

  it('rutea "Sicilian Pizza" a Pizza', () => {
    expect(getPrinterLabel("Sicilian Pizza")).toBe("Pizza");
  });

  it('rutea "Stuffed Chicago" a Pizza', () => {
    expect(getPrinterLabel("Stuffed Chicago")).toBe("Pizza");
  });

  it('rutea "Nutella Pizza" a Pizza (no a Pizzeria)', () => {
    expect(getPrinterLabel("Nutella Pizza")).toBe("Pizza");
  });

  it('rutea "Half & Half Pizza" a Pizza', () => {
    expect(getPrinterLabel("Half & Half Pizza")).toBe("Pizza");
  });

  it('rutea "4 Topp Combo" a Pizza', () => {
    expect(getPrinterLabel("4 Topp Combo")).toBe("Pizza");
  });

  it('rutea "Stuffed Dough" a Pizza', () => {
    expect(getPrinterLabel("Stuffed Dough")).toBe("Pizza");
  });

  it('rutea "Gluten Free Pizza" a Pizza', () => {
    expect(getPrinterLabel("Gluten Free Pizza")).toBe("Pizza");
  });

  it('rutea "Gluten-Free Pizza" a Pizza', () => {
    expect(getPrinterLabel("Gluten-Free Pizza")).toBe("Pizza");
  });

  it("es case-insensitive para pizza", () => {
    expect(getPrinterLabel("PEPPERONI PIZZA")).toBe("Pizza");
    expect(getPrinterLabel("calzone")).toBe("Pizza");
    expect(getPrinterLabel("STROMBOLI")).toBe("Pizza");
  });
});

// ── Impresora Pizzeria (postres) ──────────────────────────────────────────────
describe("getPrinterLabel → Pizzeria printer (postres)", () => {
  it('rutea "Zeppoli" a Pizzeria', () => {
    expect(getPrinterLabel("Zeppoli")).toBe("Pizzeria");
  });

  it('rutea "Red Velvet Cake" a Pizzeria', () => {
    expect(getPrinterLabel("Red Velvet Cake")).toBe("Pizzeria");
  });

  it('rutea "Eclair" a Pizzeria', () => {
    expect(getPrinterLabel("Eclair")).toBe("Pizzeria");
  });

  it('rutea "Chocolate Brownie" a Pizzeria', () => {
    expect(getPrinterLabel("Chocolate Brownie")).toBe("Pizzeria");
  });

  it('rutea "Cannoli" a Pizzeria', () => {
    expect(getPrinterLabel("Cannoli")).toBe("Pizzeria");
  });

  it('rutea "Baklava" a Pizzeria', () => {
    expect(getPrinterLabel("Baklava")).toBe("Pizzeria");
  });

  it('rutea "Cheesecake" a Pizzeria', () => {
    expect(getPrinterLabel("Cheesecake")).toBe("Pizzeria");
  });

  it('rutea "Tiramisu" a Pizzeria', () => {
    expect(getPrinterLabel("Tiramisu")).toBe("Pizzeria");
  });

  it('rutea "Chocolate Cake" a Pizzeria', () => {
    expect(getPrinterLabel("Chocolate Cake")).toBe("Pizzeria");
  });

  it('rutea "Carrot Cake" a Pizzeria', () => {
    expect(getPrinterLabel("Carrot Cake")).toBe("Pizzeria");
  });

  it('rutea "Seasonal Dessert" a Pizzeria', () => {
    expect(getPrinterLabel("Seasonal Dessert")).toBe("Pizzeria");
  });
});

// ── Impresora Pizzeria (bebidas) ──────────────────────────────────────────────
describe("getPrinterLabel → Pizzeria printer (bebidas)", () => {
  it('rutea "Soda Can" a Pizzeria', () => {
    expect(getPrinterLabel("Soda Can")).toBe("Pizzeria");
  });

  it('rutea "Glass Bottle Soda" a Pizzeria', () => {
    expect(getPrinterLabel("Glass Bottle Soda")).toBe("Pizzeria");
  });

  it('rutea "Perrier" a Pizzeria', () => {
    expect(getPrinterLabel("Perrier")).toBe("Pizzeria");
  });

  it('rutea "Bottled Water" a Pizzeria', () => {
    expect(getPrinterLabel("Bottled Water")).toBe("Pizzeria");
  });

  it('rutea "2 Liter Soda" a Pizzeria', () => {
    expect(getPrinterLabel("2 Liter Soda")).toBe("Pizzeria");
  });

  it('rutea "Iced Tea" a Pizzeria', () => {
    expect(getPrinterLabel("Iced Tea")).toBe("Pizzeria");
  });

  it('rutea "Root Beer Float" a Pizzeria', () => {
    expect(getPrinterLabel("Root Beer Float")).toBe("Pizzeria");
  });

  it('rutea "Vanilla Milkshake" a Pizzeria', () => {
    expect(getPrinterLabel("Vanilla Milkshake")).toBe("Pizzeria");
  });

  it('rutea "Frozen Custard" a Pizzeria', () => {
    expect(getPrinterLabel("Frozen Custard")).toBe("Pizzeria");
  });

  it('rutea "House Wine" a Pizzeria', () => {
    expect(getPrinterLabel("House Wine")).toBe("Pizzeria");
  });

  it('rutea "Draft Beer" a Pizzeria', () => {
    expect(getPrinterLabel("Draft Beer")).toBe("Pizzeria");
  });

  it('rutea "Orange Juice" a Pizzeria', () => {
    expect(getPrinterLabel("Orange Juice")).toBe("Pizzeria");
  });

  it('rutea "Lemonade" a Pizzeria', () => {
    expect(getPrinterLabel("Lemonade")).toBe("Pizzeria");
  });

  it('rutea "Water" a Pizzeria', () => {
    expect(getPrinterLabel("Water")).toBe("Pizzeria");
  });

  it('rutea "Beverage" a Pizzeria', () => {
    expect(getPrinterLabel("Beverage")).toBe("Pizzeria");
  });

  it('rutea "Soft Drink" a Pizzeria', () => {
    expect(getPrinterLabel("Soft Drink")).toBe("Pizzeria");
  });

  it('rutea "Coffee" a Pizzeria', () => {
    expect(getPrinterLabel("Coffee")).toBe("Pizzeria");
  });

  it('rutea "Espresso" a Pizzeria', () => {
    expect(getPrinterLabel("Espresso")).toBe("Pizzeria");
  });

  it('rutea "Cappuccino" a Pizzeria', () => {
    expect(getPrinterLabel("Cappuccino")).toBe("Pizzeria");
  });

  it("es case-insensitive para bebidas", () => {
    expect(getPrinterLabel("WINE")).toBe("Pizzeria");
    expect(getPrinterLabel("BEER")).toBe("Pizzeria");
    expect(getPrinterLabel("COFFEE")).toBe("Pizzeria");
  });
});

// ── Impresora Food (todo lo demás) ────────────────────────────────────────────
describe("getPrinterLabel → Food printer", () => {
  it('rutea "Buffalo Wings" a Food', () => {
    expect(getPrinterLabel("Buffalo Wings")).toBe("Food");
  });

  it('rutea "Classic Burger" a Food', () => {
    expect(getPrinterLabel("Classic Burger")).toBe("Food");
  });

  it('rutea "Fettuccine Alfredo" a Food', () => {
    expect(getPrinterLabel("Fettuccine Alfredo")).toBe("Food");
  });

  it('rutea "Caesar Salad" a Food', () => {
    expect(getPrinterLabel("Caesar Salad")).toBe("Food");
  });

  it('rutea "Garlic Bread" a Food', () => {
    expect(getPrinterLabel("Garlic Bread")).toBe("Food");
  });

  it('rutea "Mozzarella Sticks" a Food', () => {
    expect(getPrinterLabel("Mozzarella Sticks")).toBe("Food");
  });

  it('rutea "Chicken Wrap" a Food', () => {
    expect(getPrinterLabel("Chicken Wrap")).toBe("Food");
  });

  it('rutea "Club Sandwich" a Food', () => {
    expect(getPrinterLabel("Club Sandwich")).toBe("Food");
  });

  it('rutea "French Fries" a Food', () => {
    expect(getPrinterLabel("French Fries")).toBe("Food");
  });

  it('rutea "Kids Mac & Cheese" a Food', () => {
    expect(getPrinterLabel("Kids Mac & Cheese")).toBe("Food");
  });

  it('rutea "Lunch Special #1" a Food', () => {
    expect(getPrinterLabel("Lunch Special #1")).toBe("Food");
  });

  it("rutea items desconocidos a Food por defecto", () => {
    expect(getPrinterLabel("Algo que no existe en el menú")).toBe("Food");
    expect(getPrinterLabel("")).toBe("Food");
  });
});

// ── Casos límite y prioridad de reglas ────────────────────────────────────────
describe("getPrinterLabel → prioridad de reglas", () => {
  it("Pizza tiene prioridad sobre Pizzeria cuando el nombre contiene ambos keywords", () => {
    // "Nutella Pizza" contiene "pizza" (regla 1) y podría confundirse con postre
    expect(getPrinterLabel("Nutella Pizza")).toBe("Pizza");
  });

  it("Pizza tiene prioridad aunque el nombre también contenga una bebida", () => {
    // Nombre hipotético con ambos keywords — pizza siempre gana
    expect(getPrinterLabel("Pizza with Wine Sauce")).toBe("Pizza");
  });

  it("Dessert keyword en nombre parcial sigue ruteando a Pizzeria", () => {
    expect(getPrinterLabel("Special Dessert of the Day")).toBe("Pizzeria");
  });

  it("Beverage keyword en nombre parcial sigue ruteando a Pizzeria", () => {
    expect(getPrinterLabel("Premium Beverage Selection")).toBe("Pizzeria");
  });
});

// ── verifyPrintStatus ─────────────────────────────────────────────────────────
describe("verifyPrintStatus", () => {
  it("no notifica al owner cuando todos los items tienen printed=true", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [
          { id: "li-1", name: "Pepperoni Pizza", printed: true },
          { id: "li-2", name: "Buffalo Wings", printed: true },
        ],
      },
    });

    await verifyPrintStatus("order-abc", "John Smith");

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("notifica al owner cuando ningún item fue confirmado (printed=false)", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [
          { id: "li-1", name: "Pepperoni Pizza", printed: false },
          { id: "li-2", name: "Buffalo Wings", printed: false },
        ],
      },
    });

    await verifyPrintStatus("order-xyz", "Maria Rossi");

    expect(mockNotify).toHaveBeenCalledOnce();
    const call = mockNotify.mock.calls[0][0];
    expect(call.title).toContain("order-xyz");
    expect(call.content).toContain("Pepperoni Pizza");
    expect(call.content).toContain("Buffalo Wings");
    expect(call.content).toContain("Maria Rossi");
    expect(call.content).toContain("0/2");
  });

  it("notifica al owner cuando solo algunos items no fueron confirmados", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [
          { id: "li-1", name: "Pepperoni Pizza", printed: true },
          { id: "li-2", name: "Tiramisu", printed: false },
          { id: "li-3", name: "House Wine", printed: false },
        ],
      },
    });

    await verifyPrintStatus("order-partial");

    expect(mockNotify).toHaveBeenCalledOnce();
    const call = mockNotify.mock.calls[0][0];
    expect(call.content).toContain("1/3");
    expect(call.content).toContain("Tiramisu");
    expect(call.content).toContain("House Wine");
    // El item impreso no debe aparecer en la lista de no impresos
    expect(call.content).not.toContain("Pepperoni Pizza");
  });

  it("incluye el link al dashboard de Clover en la notificación", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [{ id: "li-1", name: "Calzone", printed: false }],
      },
    });

    await verifyPrintStatus("order-link-test");

    const call = mockNotify.mock.calls[0][0];
    expect(call.content).toContain("clover.com");
    expect(call.content).toContain("order-link-test");
  });

  it("no notifica si la lista de items está vacía", async () => {
    mockGet.mockResolvedValueOnce({
      data: { elements: [] },
    });

    await verifyPrintStatus("order-empty");

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("no lanza excepción si la llamada a la API falla", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));

    // No debe lanzar — es fire-and-forget
    await expect(verifyPrintStatus("order-fail")).resolves.toBeUndefined();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("funciona sin customerName (parámetro opcional)", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        elements: [{ id: "li-1", name: "Garlic Bread", printed: false }],
      },
    });

    await verifyPrintStatus("order-no-name");

    expect(mockNotify).toHaveBeenCalledOnce();
    // No debe incluir línea de Customer si no se pasó nombre
    const call = mockNotify.mock.calls[0][0];
    expect(call.content).not.toContain("Customer:");
  });
});
