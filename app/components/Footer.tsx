import { profile } from "../data/portfolio";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <p className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted sm:px-10">
        {/* Year is written out because this page is pre-built as static HTML */}
        © 2026 {profile.name}
      </p>
    </footer>
  );
}
