import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "../components/ui";

const CONTACT_EMAIL = "reservations@stayora.ng";
const CONTACT_PHONE = "0805 535 0960";
const WHATSAPP_URL = "https://wa.me/2348055350960";
const UPDATED = "12 November 2026";

export default function Policies() {
  const { pathname } = useLocation();
  const isRefund = pathname === "/refund";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/assets/stayora-mark-dark.png" alt="Stayora" className="h-8 w-auto" />
            <div>
              <p className="font-display text-base leading-none">Stayora</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Hotel Suite</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-xs sm:gap-3">
            <Link to="/" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
              Home
            </Link>
            <Link to="/book" className="rounded-md px-3 py-2 font-semibold hover:text-gold">
              Book a room
            </Link>
            <Link to="/auth" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">
              Staff
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to home
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Legal</p>
            <h1 className="mt-2 font-display text-4xl font-semibold">
              {isRefund ? "Refund & cancellation policy" : "Privacy policy"}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">Last updated: {UPDATED}</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <Link
              to="/privacy"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                !isRefund ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Privacy
            </Link>
            <Link
              to="/refund"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                isRefund ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Refunds
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-9 text-sm leading-6 text-muted-foreground">
          {isRefund ? <RefundContent /> : <PrivacyContent />}
        </div>

        <div className="mt-10 rounded-xl border border-primary/20 bg-accent p-5 text-sm text-accent-foreground">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/70 text-gold">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="font-semibold">Questions about this policy?</p>
              <p className="mt-1 text-muted-foreground">
                Contact the reservations team before booking or cancelling so we can confirm the terms that
                apply to your rate.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                <a href={`tel:+234${CONTACT_PHONE.replace(/\s/g, "").replace(/^0/, "")}`} className="flex items-center gap-1.5 hover:text-gold">
                  <Phone className="size-3.5" /> {CONTACT_PHONE}
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-gold">
                  <Mail className="size-3.5" /> {CONTACT_EMAIL}
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gold">
                  WhatsApp <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Stayora Hotel · Lagos, Nigeria
        </p>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function PrivacyContent() {
  return (
    <>
      <p>
        Stayora Hotel Suite (“Stayora”, “we”, “us”) respects your privacy. This policy explains what
        information we collect when you visit our website, make a reservation, contact our team, or use the
        staff operations suite, and how we use and protect it.
      </p>

      <PolicySection title="Who we are">
        <p>
          Stayora Hotel Suite is located in Lagos, Nigeria. We are the controller of the personal
          information described in this policy. Questions can be sent to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-gold hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </PolicySection>

      <PolicySection title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Booking details such as your name, email address, phone number, country, dates of stay, room preferences, number of guests and special requests.</li>
          <li>Guest profile and stay information, including check-in and check-out records, folio activity and service preferences.</li>
          <li>Payment status and transaction references. We do not store full payment card numbers on this website.</li>
          <li>Communications with our team by phone, email, WhatsApp or the website booking assistant.</li>
          <li>Staff account information such as name, work email, role, department and shift.</li>
          <li>Technical information such as browser type, device type and pages visited, plus essential local storage used to keep you signed in and remember preferences.</li>
        </ul>
      </PolicySection>

      <PolicySection title="How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create, confirm, modify and manage reservations and provide hotel services.</li>
          <li>To process payments, deposits, refunds and accounting records.</li>
          <li>To communicate about your stay, answer enquiries and send service updates.</li>
          <li>To improve our rooms, services, website and guest experience.</li>
          <li>To protect the security of our guests, staff, systems and property, and to prevent fraud.</li>
          <li>To meet legal, tax, accounting and regulatory obligations.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Lawful basis for processing">
        <p>
          We process personal information where it is necessary to perform a contract with you, to comply
          with a legal obligation, to protect legitimate business interests such as security and service
          improvement, or where you have given consent. Where consent is the basis, you may withdraw it at
          any time.
        </p>
      </PolicySection>

      <PolicySection title="Sharing your information">
        <p>
          We may share information with payment processors, booking channel partners, email and messaging
          providers, professional advisers, insurers and authorities where required by law. We do not sell
          your personal information. Service providers are expected to protect it and use it only for the
          services they provide to us.
        </p>
      </PolicySection>

      <PolicySection title="Retention">
        <p>
          Reservation, payment and accounting records are kept for the period required by Nigerian tax and
          accounting rules, generally up to seven years. Marketing preferences are kept until you opt out.
          Staff account records are kept while the account is active and for a reasonable period afterwards.
          In this demonstration build, data entered into the staff suite is stored in your browser’s local
          storage and can be removed by clearing site data.
        </p>
      </PolicySection>

      <PolicySection title="Security">
        <p>
          We use reasonable administrative and technical safeguards, including access controls and hashed
          staff passwords in this build. No method of transmission or storage is completely secure. Do not
          enter real payment card numbers, government identifiers or other sensitive information into this
          demonstration website. Production deployments should use HTTPS, server-side authentication, a
          managed database and database-level access rules.
        </p>
      </PolicySection>

      <PolicySection title="Your rights">
        <p>
          Subject to applicable law, you may request access to your personal information, ask us to correct
          or delete it, object to certain processing, or request a portable copy. You may also complain to
          the Nigeria Data Protection Commission. To exercise a right, contact us using the details below.
        </p>
      </PolicySection>

      <PolicySection title="Cookies and local storage">
        <p>
          This website uses essential local storage to keep staff sessions active, remember notification
          preferences and store demonstration data. We do not use advertising trackers. You can clear local
          storage through your browser settings, although this will sign you out and reset demo data.
        </p>
      </PolicySection>

      <PolicySection title="Children">
        <p>
          Our website is not directed at children. Guests under 18 should make bookings with a parent or
          guardian, and we do not knowingly collect children’s information except as part of a family
          reservation.
        </p>
      </PolicySection>

      <PolicySection title="Changes to this policy">
        <p>
          We may update this policy from time to time. The “last updated” date at the top shows the current
          version. Material changes will be communicated through the website or directly where appropriate.
        </p>
      </PolicySection>
    </>
  );
}

function RefundContent() {
  return (
    <>
      <p>
        This policy applies to room reservations made through the Stayora website, our WhatsApp booking
        assistant, or directly with our reservations team. The cancellation terms shown on your confirmation
        override this general policy where they are different.
      </p>

      <PolicySection title="Direct bookings">
        <ul className="list-disc space-y-2 pl-5">
          <li><span className="font-semibold text-foreground">Free cancellation:</span> cancel at least 48 hours before the scheduled check-in time (14:00 local time) for a full refund of prepaid room charges.</li>
          <li><span className="font-semibold text-foreground">Late cancellation:</span> cancelling within 48 hours of check-in may incur a charge equal to the first night’s room rate plus applicable taxes.</li>
          <li><span className="font-semibold text-foreground">No-show:</span> if you do not arrive and do not cancel, we may charge the first night’s room rate plus applicable taxes.</li>
          <li><span className="font-semibold text-foreground">Non-refundable rates:</span> rates marked non-refundable or “pay now” are not refundable except where required by law.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Early departure">
        <p>
          If you leave before your confirmed check-out date, unused nights may not be refundable. We will
          review requests for exceptional circumstances at the hotel’s discretion and in line with applicable
          consumer law.
        </p>
      </PolicySection>

      <PolicySection title="Channel and OTA bookings">
        <p>
          Bookings made through online travel agencies, corporate travel platforms or other third-party
          channels are governed by that channel’s cancellation and refund rules. Please cancel through the
          original booking channel. We will follow the channel’s instructions when processing any refund.
        </p>
      </PolicySection>

      <PolicySection title="Groups, events and venue hire">
        <p>
          Group room blocks, events, conferences and venue hire are subject to the signed confirmation or
          event contract. Deposits are generally non-refundable within seven days of the event date, and
          separate minimum-spend or attrition terms may apply. Your event contract takes precedence over
          this page.
        </p>
      </PolicySection>

      <PolicySection title="Refund processing">
        <ul className="list-disc space-y-2 pl-5">
          <li>Approved refunds are returned to the original payment method.</li>
          <li>Processing usually takes 5–10 business days after approval, depending on your bank or payment provider.</li>
          <li>Bank charges, currency conversion differences and third-party channel fees may be deducted where permitted.</li>
          <li>Cash or transfer refunds may require valid identification and proof of payment.</li>
        </ul>
      </PolicySection>

      <PolicySection title="How to cancel">
        <p>
          Contact reservations by phone, email or WhatsApp with your booking reference and the name on the
          reservation. A cancellation is effective only when our team acknowledges it in writing. Keep the
          acknowledgement for your records.
        </p>
      </PolicySection>

      <PolicySection title="Force majeure">
        <p>
          If a stay cannot proceed because of government restrictions, civil unrest, natural disaster, power
          failure, pandemic or another event outside our reasonable control, we may offer a date change,
          credit or refund at our discretion and in line with applicable law.
        </p>
      </PolicySection>

      <PolicySection title="Chargebacks and disputes">
        <p>
          Please contact us before raising a payment dispute so we can investigate quickly. We may ask for
          your booking confirmation, payment receipt and identification to resolve a chargeback.
        </p>
      </PolicySection>
    </>
  );
}
