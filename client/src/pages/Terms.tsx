/**
 * Terms & Conditions — Napoli Pizzeria North Las Vegas
 * Legal protections covering allergens, liability, ordering, payments, and general use.
 */
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { RESTAURANT_INFO } from "@/lib/napoliData";

const LAST_UPDATED = "June 2025";

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.008 80)" }}>
      {/* Header */}
      <div className="bg-napoli-dark py-10">
        <div className="container">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm napoli-body mb-6 hover:text-napoli-red transition-colors" style={{ color: "oklch(0.65 0.015 80)" }}>
              <ArrowLeft size={15} /> Back to Home
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={28} style={{ color: "var(--napoli-gold)" }} />
            <h1 className="napoli-display text-3xl" style={{ color: "oklch(0.95 0.015 80)" }}>
              Terms & Conditions
            </h1>
          </div>
          <p className="text-sm napoli-body" style={{ color: "oklch(0.55 0.015 80)" }}>
            The Original Napoli Pizzeria · North Las Vegas, NV · Last updated: {LAST_UPDATED}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-10" style={{ border: "1px solid oklch(0.90 0.010 80)" }}>

          {/* Intro */}
          <section>
            <p className="napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              By placing an order through the Napoli Pizzeria website (the "Site") or by visiting our restaurant located at{" "}
              <strong>{RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}</strong>, you ("Customer") agree to be bound by these Terms and Conditions. Please read them carefully before completing your purchase.
            </p>
          </section>

          <Divider />

          {/* 1. Allergen Disclosure */}
          <section>
            <SectionTitle number="1" title="Allergen Disclosure & Food Allergy Responsibility" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                <strong>Our kitchen handles common allergens</strong>, including but not limited to: wheat/gluten, dairy (milk, cheese), eggs, tree nuts, peanuts, soy, fish, shellfish, and sesame. Cross-contamination may occur during food preparation.
              </p>
              <p>
                <strong>Customer Responsibility:</strong> It is the sole responsibility of the Customer to notify Napoli Pizzeria of any food allergies, dietary restrictions, or medical conditions <em>before</em> placing an order. Allergy notes must be entered in the designated "Allergy Note" field during checkout or communicated directly to our staff by phone at{" "}
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="underline hover:text-napoli-red transition-colors">{RESTAURANT_INFO.phone}</a>.
              </p>
              <p>
                <strong>Limitation of Liability:</strong> Napoli Pizzeria shall not be held liable for any allergic reactions, adverse health events, or injuries resulting from the consumption of our food products when the Customer has failed to disclose a known allergy or dietary restriction prior to ordering. By completing a purchase without disclosing an allergy, the Customer expressly acknowledges and accepts this risk.
              </p>
              <p>
                While we make reasonable efforts to accommodate allergy requests, we cannot guarantee that any menu item is entirely free of allergens due to the shared nature of our kitchen environment. Customers with severe allergies are advised to exercise caution.
              </p>
            </div>
          </section>

          <Divider />

          {/* 2. Online Ordering */}
          <section>
            <SectionTitle number="2" title="Online Ordering & Order Accuracy" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                Orders placed through the Site are subject to acceptance by Napoli Pizzeria. We reserve the right to refuse or cancel any order at our discretion, including in cases of pricing errors, item unavailability, or suspected fraudulent activity.
              </p>
              <p>
                The Customer is responsible for reviewing their order summary before submitting. Napoli Pizzeria is not responsible for errors in orders resulting from incorrect information provided by the Customer, including wrong delivery addresses, incorrect item selections, or missing customization instructions.
              </p>
              <p>
                Estimated preparation and delivery times are provided as approximations only and are not guaranteed. Delays may occur due to high order volume, weather conditions, or other factors beyond our control.
              </p>
            </div>
          </section>

          <Divider />

          {/* 3. Pricing & Payments */}
          <section>
            <SectionTitle number="3" title="Pricing, Taxes & Payment" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                All prices displayed on the Site are in U.S. dollars and are subject to change without prior notice. Applicable sales taxes will be calculated and added at checkout in accordance with Nevada state and local tax regulations.
              </p>
              <p>
                A delivery fee starting at <strong>$1.99</strong> applies to all delivery orders. A credit/debit card processing fee of <strong>$1.00</strong> applies to all card transactions. These fees are non-refundable.
              </p>
              <p>
                We accept major credit cards, debit cards, and cash (in-store only). Online payments are processed securely through our payment processor. Napoli Pizzeria does not store full card numbers on our servers.
              </p>
            </div>
          </section>

          <Divider />

          {/* 4. Refunds & Cancellations */}
          <section>
            <SectionTitle number="4" title="Refunds, Cancellations & Order Modifications" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                Once an order has been accepted and preparation has begun, cancellations are not guaranteed. Customers wishing to cancel or modify an order must contact us immediately by phone at{" "}
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="underline hover:text-napoli-red transition-colors">{RESTAURANT_INFO.phone}</a>.
              </p>
              <p>
                Refunds may be issued at the sole discretion of Napoli Pizzeria management in cases of order errors attributable to our kitchen. Refunds will not be issued for customer preference changes after the order has been prepared.
              </p>
              <p>
                In the event of a delivery issue (e.g., wrong address provided by the customer, missed delivery window), Napoli Pizzeria is not obligated to issue a refund or re-deliver at no charge.
              </p>
            </div>
          </section>

          <Divider />

          {/* 5. Delivery */}
          <section>
            <SectionTitle number="5" title="Delivery Terms" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                Delivery is available within our designated service area. Napoli Pizzeria reserves the right to modify the delivery zone at any time. Orders outside the delivery area may be declined.
              </p>
              <p>
                The Customer must be present at the delivery address to receive the order. If no one is available to receive the order after a reasonable waiting period, the order may be returned and no refund will be issued.
              </p>
              <p>
                Delivery drivers are independent contractors or employees of Napoli Pizzeria. Any damage to property or person caused by a delivery driver must be reported immediately to management.
              </p>
            </div>
          </section>

          <Divider />

          {/* 6. Intellectual Property */}
          <section>
            <SectionTitle number="6" title="Intellectual Property" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                All content on this Site, including but not limited to text, images, logos, menu designs, and graphics, is the property of The Original Napoli Pizzeria and is protected by applicable copyright and trademark laws. Unauthorized reproduction, distribution, or use of any content is strictly prohibited.
              </p>
            </div>
          </section>

          <Divider />

          {/* 7. Limitation of Liability */}
          <section>
            <SectionTitle number="7" title="Limitation of Liability" />
            <div className="space-y-3 napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                To the maximum extent permitted by applicable law, Napoli Pizzeria, its owners, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Site or the consumption of our food products.
              </p>
              <p>
                Our total liability to any Customer for any claim arising from an order shall not exceed the total amount paid by the Customer for that specific order.
              </p>
            </div>
          </section>

          <Divider />

          {/* 8. Governing Law */}
          <section>
            <SectionTitle number="8" title="Governing Law" />
            <div className="napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                These Terms and Conditions shall be governed by and construed in accordance with the laws of the State of Nevada, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Clark County, Nevada.
              </p>
            </div>
          </section>

          <Divider />

          {/* 9. Changes */}
          <section>
            <SectionTitle number="9" title="Changes to These Terms" />
            <div className="napoli-body text-sm leading-relaxed" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>
                Napoli Pizzeria reserves the right to update or modify these Terms and Conditions at any time without prior notice. Continued use of the Site or placement of an order after any changes constitutes acceptance of the revised Terms.
              </p>
            </div>
          </section>

          <Divider />

          {/* Contact */}
          <section>
            <SectionTitle number="10" title="Contact Us" />
            <div className="napoli-body text-sm leading-relaxed space-y-2" style={{ color: "oklch(0.35 0.02 30)" }}>
              <p>If you have questions about these Terms, please contact us:</p>
              <p><strong>The Original Napoli Pizzeria</strong></p>
              <p>{RESTAURANT_INFO.address}, {RESTAURANT_INFO.city}</p>
              <p>
                Phone:{" "}
                <a href={`tel:${RESTAURANT_INFO.phone}`} className="underline hover:text-napoli-red transition-colors">
                  {RESTAURANT_INFO.phone}
                </a>
              </p>
              <p>
                Website:{" "}
                <a href={`https://${RESTAURANT_INFO.website}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-napoli-red transition-colors">
                  {RESTAURANT_INFO.website}
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="napoli-heading text-lg mb-4 flex items-start gap-2" style={{ color: "var(--napoli-dark)" }}>
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5"
        style={{ background: "var(--napoli-red)", color: "white" }}
      >
        {number}
      </span>
      {title}
    </h2>
  );
}

function Divider() {
  return <hr style={{ borderColor: "oklch(0.92 0.010 80)" }} />;
}
