// Small line icons shown above each section title, drawn in the style of
// SF Symbols: thin, rounded strokes on a 24px grid.

const paths = {
  about: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" />
    </>
  ),
  projects: (
    <>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l2 2h7.3a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </>
  ),
  experience: (
    <>
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
    </>
  ),
  skills: (
    <>
      <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 6l-3 12" />
    </>
  ),
  contact: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </>
  ),
};

export type SectionIconName = keyof typeof paths;

export default function SectionIcon({ name }: { name: SectionIconName }) {
  return (
    <span className="mb-5 grid size-10 place-items-center rounded-xl bg-tint text-accent">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {paths[name]}
      </svg>
    </span>
  );
}
