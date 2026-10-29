import Reveal from "./Reveal";
import { Ground } from "./park/scenery";

// One spot in the park, shared by every section so they all line up.
// A small wooden sign names the spot (`place`), the section's heading and
// content sit beside it, and an illustration (`scene`) stands on the grass.
//
// Stacked layout (phones, tablets, reduced motion): sign and heading above
// the content, scene and ground below it.
// Walking layout (ParkWalk): each zone is at least a screen wide, the sign
// and heading form a column on the left, and the scene stands to the right.
// `sceneWidth` sets how much room the scene gets there.

type ZoneProps = {
  id: string;
  place: string;
  title?: string; // leave out when the section renders its own heading
  scene?: React.ReactNode;
  sceneWidth?: string;
  // Sit the content on the ground instead of centering it on the screen
  grounded?: boolean;
  // Skip the scroll reveal (the hero has its own entrance)
  reveal?: boolean;
  children: React.ReactNode;
};

export default function Zone({
  id,
  place,
  title,
  scene,
  sceneWidth,
  grounded = false,
  reveal = true,
  children,
}: ZoneProps) {
  const sign = <p className={`plank ${reveal ? "" : "enter"}`}>{place}</p>;
  const content = title ? (
    <div className="flex flex-col gap-8 walk:flex-row walk:gap-12">
      <header className="walk:w-52 walk:shrink-0">
        {sign}
        <h2
          id={`${id}-title`}
          className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl walk:text-4xl"
        >
          {title}
        </h2>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  ) : (
    <div>
      {sign}
      {children}
    </div>
  );

  return (
    <section
      id={id}
      aria-labelledby={title ? `${id}-title` : undefined}
      className={`zone ${grounded ? "zone-grounded" : ""}`}
      style={sceneWidth ? ({ "--scene-w": sceneWidth } as React.CSSProperties) : undefined}
    >
      <div className="zone-body">
        {reveal ? <Reveal delay={120}>{content}</Reveal> : <div>{content}</div>}
      </div>
      <div className="zone-land" aria-hidden="true">
        {scene && <Reveal className="zone-scene">{scene}</Reveal>}
        <Ground />
      </div>
    </section>
  );
}
