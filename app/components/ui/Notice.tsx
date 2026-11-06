import Link from "next/link";

// A notice on paper, in the middle of the view: for a page that isn't
// there, a page that failed, or a section with nothing in it yet. Always
// says what happened and gives the way back.
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
    <main className="over-world location" data-side="middle">
      <div className="lost-notice paper arrive take-clicks">
        <p className="location-place">{kicker}</p>
        <h1 className="location-title">{title}</h1>
        <p className="location-intro">{children}</p>
        <p className="lost-notice-links">
          {action && (
            <button type="button" className="text-link" onClick={action.onClick}>
              {action.label}
            </button>
          )}
          <Link href="/" className="text-link">
            Back to the park
          </Link>
          <Link href="/map" className="text-link">
            Open the map
          </Link>
        </p>
      </div>
    </main>
  );
}
