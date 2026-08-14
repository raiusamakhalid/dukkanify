import type { ContactContent } from "@dukkanify/contracts";
import { MapPin, Mail, MessageCircle, Phone } from "lucide-react";
import { SectionHeading } from "./section-heading";

/**
 * How to reach the shop.
 *
 * Every detail is a real link — `mailto:`, `tel:`, and WhatsApp with the number reduced to
 * digits, which is the only form `wa.me` accepts. A phone number rendered as plain text on a
 * phone is a number nobody calls.
 *
 * Laid out as cards rather than a description list on one column: contact details are four
 * separate things a person picks *one* of, and a grid of four targets is easier to hit than
 * four lines of text — on a phone especially, where every one of these is a tap.
 */
export function ContactSection({ content }: { content: ContactContent }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-4xl">
        <SectionHeading heading={content.heading} />

        <dl className="mt-10 grid gap-4 sm:grid-cols-2">
          <Detail label="Email" icon={<Mail className="size-4" />}>
            <ContactLink href={`mailto:${content.email}`}>
              {content.email}
            </ContactLink>
          </Detail>

          <Detail label="Phone" icon={<Phone className="size-4" />}>
            <ContactLink href={`tel:${dialable(content.phone)}`}>
              {content.phone}
            </ContactLink>
          </Detail>

          {content.whatsapp !== undefined && (
            <Detail
              label="WhatsApp"
              icon={<MessageCircle className="size-4" />}
            >
              <ContactLink href={`https://wa.me/${digitsOf(content.whatsapp)}`}>
                {content.whatsapp}
              </ContactLink>
            </Detail>
          )}

          <Detail label="Visit" icon={<MapPin className="size-4" />}>
            <address
              className="not-italic"
              style={{ color: "var(--brand-fg)" }}
            >
              {content.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </Detail>
        </dl>
      </div>
    </section>
  );
}

function Detail({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-4 p-5"
      style={{
        border:
          "1px solid color-mix(in srgb, var(--brand-muted) 22%, transparent)",
        borderRadius: "var(--brand-radius)",
        fontFamily: "var(--brand-font-body)",
      }}
    >
      <span
        className="grid size-9 shrink-0 place-items-center"
        aria-hidden="true"
        style={{
          background:
            "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
          color: "var(--brand-primary)",
          borderRadius: "var(--brand-radius)",
        }}
      >
        {icon}
      </span>

      <div className="min-w-0">
        <dt
          className="text-xs tracking-wide uppercase"
          style={{ color: "var(--brand-muted)" }}
        >
          {label}
        </dt>
        <dd className="mt-1 break-words">{children}</dd>
      </div>
    </div>
  );
}

function ContactLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="underline-offset-4 hover:underline"
      style={{ color: "var(--brand-fg)" }}
    >
      {children}
    </a>
  );
}

/** `tel:` keeps a leading `+`; everything else a person typed for readability goes. */
function dialable(phone: string): string {
  const digits = digitsOf(phone);
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}
