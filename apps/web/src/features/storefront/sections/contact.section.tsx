import type { ContactContent } from "@dukkanify/contracts";
import { SectionHeading } from "./section-heading";

/**
 * How to reach the shop.
 *
 * Every detail is a real link — `mailto:`, `tel:`, and WhatsApp with the number reduced to
 * digits, which is the only form `wa.me` accepts. A phone number rendered as plain text on a
 * phone is a number nobody calls.
 */
export function ContactSection({ content }: { content: ContactContent }) {
  return (
    <section
      className="px-6 sm:px-10"
      style={{ paddingBlock: "var(--brand-space)" }}
    >
      <div className="mx-auto max-w-2xl">
        <SectionHeading heading={content.heading} />

        <dl
          className="mt-8 grid gap-6 sm:grid-cols-2"
          style={{ fontFamily: "var(--brand-font-body)" }}
        >
          <Detail label="Email">
            <ContactLink href={`mailto:${content.email}`}>
              {content.email}
            </ContactLink>
          </Detail>

          <Detail label="Phone">
            <ContactLink href={`tel:${dialable(content.phone)}`}>
              {content.phone}
            </ContactLink>
          </Detail>

          {content.whatsapp !== undefined && (
            <Detail label="WhatsApp">
              <ContactLink href={`https://wa.me/${digitsOf(content.whatsapp)}`}>
                {content.whatsapp}
              </ContactLink>
            </Detail>
          )}

          <Detail label="Visit">
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt
        className="text-xs tracking-wide uppercase"
        style={{ color: "var(--brand-muted)" }}
      >
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
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
