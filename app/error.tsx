"use client";

import Notice from "./components/ui/Notice";

// A page that failed while rendering: the notice says so, and offers to
// try again. The world and the controls around it are unaffected.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Notice kicker="Something went wrong" title="This page didn't load" action={{ label: "Try again", onClick: reset }}>
      The rest of the park is fine. Try the page again, or go back and come in another way.
    </Notice>
  );
}
