import type { Metadata } from "next";
import Notice from "./components/ui/Notice";

export const metadata: Metadata = {
  title: "Not found",
};

// An address with no page: a notice, and the way back
export default function NotFound() {
  return (
    <Notice kicker="Not found" title="Nothing here">
      There&apos;s no page at this address. The rest of the site is where it was.
    </Notice>
  );
}
