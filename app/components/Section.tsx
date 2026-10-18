import Reveal from "./Reveal";

// A shared wrapper used by every page section so they all line up:
// the title sits in a narrow left column and the content in a wider
// right column. The `id` is what the navbar links jump to.

// Background tones, so sections can alternate for a sense of depth.
const tones = {
  base: "bg-background",
  soft: "bg-surface",
};

type SectionProps = {
  id: string;
  title: string;
  tone?: keyof typeof tones;
  children: React.ReactNode;
};

export default function Section({
  id,
  title,
  tone = "base",
  children,
}: SectionProps) {
  return (
    <section id={id} className={tones[tone]}>
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
        <Reveal>
          <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-16">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <div className="max-w-3xl">{children}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
