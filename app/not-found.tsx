import type { Metadata } from "next";
import Notice from "./components/ui/Notice";

export const metadata: Metadata = {
  title: "Not found",
};

// An address with no page: a notice in the park, and the way back
export default function NotFound() {
  return (
    <Notice kicker="A path that isn't on the map" title="Nothing here">
      There&apos;s no page at this address. Everything else is still where it was.
    </Notice>
  );
}
