import { CountUp } from "@/components/motion/count-up";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Container } from "./section";

/**
 * The strip under the hero.
 *
 * These are facts about what the generator emits, not adoption figures. That is a deliberate
 * choice and worth stating: a product with no users cannot honestly print "10,000 stores
 * created", and a number on a landing page is a claim whether or not anyone checks it. Every
 * figure below is checkable against the code — eight products and three pages come out of
 * `BlueprintSchema`, the two languages are `Locale`, and the one sentence is the whole input.
 *
 * Swapping these for real usage numbers later is one array.
 */
const FACTS = [
  {
    value: 1,
    suffix: "",
    label: "Sentence in",
    detail:
      "No theme picker, no blocks to drag, no placeholder copy to delete.",
  },
  {
    value: 8,
    suffix: "",
    label: "Products out",
    detail: "Named, described and priced in AED, sorted into real categories.",
  },
  {
    value: 3,
    suffix: "",
    label: "Pages written",
    detail: "Home, About and Contact — each one editable in place.",
  },
  {
    value: 2,
    suffix: "",
    label: "Languages",
    detail:
      "English and Arabic, right-to-left included, chosen by your prompt.",
  },
] as const;

export function SocialProof() {
  return (
    <section
      aria-labelledby="proof-title"
      className="border-line/70 border-y bg-card/40"
    >
      <Container>
        <div className="py-14 sm:py-16">
          <h2
            id="proof-title"
            className="text-muted-foreground text-center text-[11px] font-semibold tracking-[0.22em] uppercase"
          >
            One sentence is the whole brief
          </h2>

          <RevealGroup
            as="ul"
            className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
            stagger={0.1}
          >
            {FACTS.map((fact) => (
              <RevealItem as="li" key={fact.label}>
                <p className="font-heading text-emerald text-5xl font-semibold sm:text-6xl">
                  <CountUp
                    to={fact.value}
                    suffix={fact.suffix}
                    duration={1.1}
                  />
                </p>
                <p className="text-foreground mt-3 text-sm font-semibold">
                  {fact.label}
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {fact.detail}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
