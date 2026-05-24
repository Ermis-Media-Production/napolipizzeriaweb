import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

const CATERING_EMAIL = "info@napolipizzeria.net";

export const cateringRouter = router({
  submitInquiry: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        email: z.string().email("Valid email required"),
        phone: z.string().min(7, "Phone number required"),
        eventType: z.string().min(1, "Event type required"),
        eventDate: z.string().min(1, "Event date required"),
        guestCount: z.string().min(1, "Guest count required"),
        package: z.string().min(1, "Package selection required"),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const content = `
🍕 NEW CATERING INQUIRY — Napoli Pizzeria

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:        ${input.name}
Email:       ${input.email}
Phone:       ${input.phone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event Type:  ${input.eventType}
Event Date:  ${input.eventDate}
Guests:      ${input.guestCount}
Package:     ${input.package}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.message || "(none)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reply to: ${input.email}
Forward to: ${CATERING_EMAIL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim();

      // Send notification to owner via Manus notification service
      await notifyOwner({
        title: `🍕 Catering Inquiry from ${input.name} — ${input.eventType} (${input.guestCount} guests)`,
        content,
      });

      // Also attempt to send via Forge email API if available
      try {
        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (forgeBaseUrl && forgeKey) {
          const emailEndpoint = `${forgeBaseUrl}/v1/email/send`;
          await fetch(emailEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${forgeKey}`,
            },
            body: JSON.stringify({
              to: CATERING_EMAIL,
              subject: `Catering Inquiry: ${input.eventType} — ${input.name} (${input.guestCount} guests)`,
              text: content,
              replyTo: input.email,
            }),
          });
        }
      } catch (err) {
        // Email sending is best-effort; notification already sent above
        console.warn("[Catering] Email send attempt failed:", err);
      }

      return { success: true };
    }),
});
