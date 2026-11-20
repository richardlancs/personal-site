import Link from "next/link";

// A notice in the middle of the page (city.css, "The notice"): for a page
// that isn't there or a page that failed. Always says what happened and
// gives the way back to the start of the site.
export default function Notice({
  kicker,
  title,
  children,
  action,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <main className="notice">
      <div className="notice-panel">
        <p className="notice-kicker">{kicker}</p>
        <h1 className="notice-title">{title}</h1>
        <p className="notice-text">{children}</p>
        <p className="notice-actions">
          {action && (
            <button type="button" className="glass glass-primary" onClick={action.onClick}>
              {action.label}
            </button>
          )}
          <Link href="/" className="glass">
            Back to the start
          </Link>
        </p>
      </div>
    </main>
  );
}
