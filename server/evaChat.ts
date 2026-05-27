/**
 * Eva AI Chat Router
 *
 * Powers the in-page Eva AI virtual sales assistant for Napoli Pizzeria.
 * - chat: send messages and get LLM responses (also logs the user question)
 * - logQuestion: upsert a question by normalized text, increment count
 * - getTopQuestions: return the top-4 most-asked questions (min 2 asks)
 *                    falls back to default questions when data is sparse
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { evaQuestions } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

// ── Eva persona ───────────────────────────────────────────────────────────────
const EVA_SYSTEM_PROMPT = `You are Eva, the friendly and knowledgeable virtual sales assistant for Napoli Pizzeria in North Las Vegas, Nevada.

PERSONALITY:
- Warm, welcoming, and enthusiastic about great Italian food
- Helpful and efficient — customers want answers fast
- Occasionally use Italian food expressions naturally (e.g., "Buonissimo!", "Perfetto!")
- Keep responses concise (2-4 sentences max) unless the customer asks for details
- Always end with a helpful follow-up question or a call to action

RESTAURANT INFO:
- Name: Napoli Pizzeria
- Address: 3131 W Craig Rd, North Las Vegas, NV 89032
- Phone: 725-204-0379
- Hours: Every Day 10:00 AM – 10:00 PM (Las Vegas time)
- Online orders close at 9:30 PM to give the kitchen time to prepare the last order

ORDERING OPTIONS:
- Dine-In, To Go / Pick Up, Delivery (Uber Direct, up to 20 miles), Scheduled Orders
- Online ordering available at napolipizzerianorthlasvegas.com
- Payment: Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay

MENU HIGHLIGHTS:
- Famous 30" and 36" Giant Pizzas (a Napoli specialty!)
- Lunch Specials: Mon–Fri 10 AM–3 PM, starting at $9.49, includes FREE can of soda
  * #8 Two Slices + Soda: $9.49 | #1 Triple Decker BLT + Fries: $10.49 | #3 10" Pizza 1 Topping: $10.49
  * #5 3 Chicken Fingers + Fries: $12.49 | #11 1/2 Pound Cheeseburger + Fries: $12.49
  * #7 Lasagna + Garlic Bread: $15.49 | #16 10 Wings + Fries: $15.49
- Pick Up Special: 16" Pizza 1 Topping for $12.99
- Anytime Specials: Multiple combo deals available
- Full menu: Appetizers, Pizzas (10"–36"), Wings, Pasta, Subs, Burgers, Salads, Desserts

DELIVERY:
- Powered by Uber Direct
- Available within 20 miles of the restaurant
- Delivery fee calculated at checkout based on distance
- Estimated delivery time shown at checkout

RESERVATIONS & CATERING:
- Reservations available for dine-in and private events
- Catering available — visit the Reservations page or call 725-204-0379
- For large groups or events outside business hours, call directly

SCHEDULED ORDERS:
- Customers can place orders in advance (up to 30 days ahead)
- Useful for ordering when the restaurant is closed — order now, pick up when we open!
- Available for pickup and delivery

IMPORTANT RULES:
- If asked about specific prices not listed above, say prices may vary and direct them to the menu page or to call
- Never make up information — if unsure, direct to call 725-204-0379
- For complaints or order issues, direct to call 725-204-0379 immediately
- Do NOT process orders yourself — direct customers to use the website menu or call
- If asked about allergens or dietary restrictions, recommend calling 725-204-0379 for accurate info
`;

// ── Normalize prompt: group similar questions together ────────────────────────
const NORMALIZE_PROMPT = `You are a question normalizer for a restaurant chatbot.
Given a customer question, return a short canonical normalized version (max 80 chars, lowercase, no punctuation) that captures the core intent.
Group semantically identical questions together (e.g. "what time do you open?" and "when do you open?" → "what time does the restaurant open").
Return ONLY the normalized text, nothing else.`;

async function normalizeQuestion(question: string): Promise<string> {
  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: NORMALIZE_PROMPT },
        { role: "user", content: question.slice(0, 300) },
      ],
    });
    const normalized = (res.choices?.[0]?.message?.content ?? question)
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .slice(0, 512);
    return normalized || question.toLowerCase().trim().slice(0, 512);
  } catch {
    return question.toLowerCase().trim().slice(0, 512);
  }
}

// ── Upsert question in DB ─────────────────────────────────────────────────────
async function upsertQuestion(rawText: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const normalized = await normalizeQuestion(rawText);
    // Try insert; on duplicate key (normalizedText), increment count
    await db.insert(evaQuestions).values({
      questionText: rawText.slice(0, 1000),
      normalizedText: normalized,
      count: 1,
    }).onDuplicateKeyUpdate({
      set: {
        count: sql`count + 1`,
        questionText: rawText.slice(0, 1000), // keep most recent phrasing
        lastAskedAt: sql`NOW()`,
      },
    });
  } catch {
    // Non-critical — never block the chat response
  }
}

// ── Default questions (shown when not enough data yet) ────────────────────────
const DEFAULT_QUESTIONS = [
  "What are today's specials?",
  "Do you deliver to my area?",
  "What are your hours?",
  "Can I customize my pizza?",
];

// ── Message schema ────────────────────────────────────────────────────────────
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// ── Router ────────────────────────────────────────────────────────────────────
export const evaChatRouter = router({
  /**
   * Send a message to Eva and get an AI response.
   * Also logs the latest user question asynchronously (fire-and-forget).
   */
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(MessageSchema).max(20),
      })
    )
    .mutation(async ({ input }) => {
      // Fire-and-forget: log the last user message
      const lastUserMsg = [...input.messages].reverse().find((m) => m.role === "user");
      if (lastUserMsg?.content?.trim()) {
        void upsertQuestion(lastUserMsg.content.trim());
      }

      const llmMessages = [
        { role: "system" as const, content: EVA_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const reply =
        response.choices?.[0]?.message?.content ??
        "I'm sorry, I couldn't process that. Please call us at 725-204-0379 for immediate assistance!";

      return { reply: typeof reply === "string" ? reply : String(reply) };
    }),

  /**
   * Return the top 4 most-asked questions.
   * Only includes questions asked at least 2 times.
   * Falls back to defaults if fewer than 4 qualifying questions exist.
   */
  getTopQuestions: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { questions: DEFAULT_QUESTIONS };
      const rows = await db
        .select({ questionText: evaQuestions.questionText, count: evaQuestions.count })
        .from(evaQuestions)
        .where(sql`count >= 2`)
        .orderBy(desc(evaQuestions.count))
        .limit(4);

      if (rows.length >= 4) {
        return { questions: rows.map((r) => r.questionText) };
      }

      // Blend real top questions with defaults to always show 4
      const real = rows.map((r) => r.questionText);
      const fillers = DEFAULT_QUESTIONS.filter((d) => !real.some((r) => r.toLowerCase().includes(d.toLowerCase().slice(0, 20))));
      return { questions: [...real, ...fillers].slice(0, 4) };
    } catch {
      return { questions: DEFAULT_QUESTIONS };
    }
  }),
});
