// All of the site's content lives in this one file.
// To update your portfolio, edit the values below — you shouldn't need to
// touch the components. Anything in [square brackets] is a placeholder.

// A real screenshot of the project, saved in public/projects/
export type Screenshot = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Project = {
  title: string;
  summary: string; // one sentence: what it is
  role?: string; // my place on the team, when it isn't only mine
  features: string[]; // what the product does, as short bullets
  contributions?: string[]; // what I did myself, kept apart from the team's work
  technologies: string[];
  githubUrl: string;
  liveUrl?: string; // optional: leave it out if there is no live demo
  screenshots?: Screenshot[]; // optional; the first one is shown largest
};

export type Experience = {
  role: string;
  organization: string;
  location?: string; // optional
  startDate: string;
  endDate?: string; // optional, e.g. "Present"; leave out for a single date
  highlights: string[];
};

export type SkillGroup = {
  category: string;
  skills: string[];
};

// `scene` names the illustration an interest will get in its painted
// location (not drawn yet).
export type Interest = {
  name: string;
  description: string;
  scene: "basketball" | "badminton" | "chess" | "poker";
};

export const profile = {
  name: "Richard Lan",
  headline: "CS student @uwaterloo",
  // Two short sentences, shown under the name on phones
  intro:
    "I build practical software, lately a stock market simulator and a Chrome extension for searching saved TikToks. I'm looking for a software engineering internship or co‑op.",
  emails: [
    { label: "School email", address: "r6lan@uwaterloo.ca" },
    { label: "Personal email", address: "lanrichard159@gmail.com" },
  ],
  githubUrl: "https://github.com/richardlancs",
  linkedinUrl: "https://www.linkedin.com/in/richard-lan-0312072a8",
  // The PDF in public/resume/; replace the file to update it
  resumeUrl: "/resume/richard-lan-resume.pdf",
};

// Background song, played only when a visitor presses the music button.
// Put the audio file in public/audio/ with the name used in `src`.
// "Chill lofi inspired" by omfgdude, CC0 (public domain):
// https://opengameart.org/content/chill-lofi-inspired
export const backgroundMusic = {
  title: "Chill lofi inspired",
  artist: "omfgdude",
  src: "/audio/chill-lofi.mp3",
};

// The notebook in the pavilion: one entry to a page, each a heading and a
// few short points. The last page (where to find me) is built from
// `profile` in app/about/page.tsx.
export type AboutPage = {
  heading: string;
  points: string[];
};

export const about: AboutPage[] = [
  {
    heading: "Who I am",
    points: [
      "Computer Science student at the University of Waterloo.",
      "Interested in software development, artificial intelligence, and building practical projects.",
    ],
  },
  {
    heading: "Building and learning",
    points: [
      "MarketLab, a stock market simulator.",
      "Scrollganizer, a Chrome extension for searching saved TikToks, with a team of three.",
      "Next: digging into AI and machine learning.",
      "Looking for a software engineering internship or co‑op.",
    ],
  },
  {
    heading: "Away from the keyboard",
    points: [
      "Badminton, basketball, lifting weights, and poker.",
      "They keep me active and competitive.",
      "Poker has taught me to think in probabilities and stay calm with incomplete information.",
    ],
  },
];

// The line beside the GitHub link on the notebook's last page
export const githubNote = "where I document what I'm learning and share what I build";

export const projects: Project[] = [
  {
    title: "MarketLab",
    summary: "A stock market simulator: a web app that runs on simulated prices, not real market data.",
    features: [
      "Market dashboard and a screener covering about 95 US stocks.",
      "Paper trading, with portfolio risk analytics.",
      "Strategy backtester with walk-forward testing.",
      "Price alerts with push notifications, monthly trading competitions, and short lessons with quizzes.",
      "Heavier analytics run in a separate Python service.",
    ],
    technologies: [
      "TypeScript",
      "Next.js",
      "React",
      "Tailwind CSS",
      "Python (FastAPI, pandas, NumPy)",
      "SQLite (Turso, Drizzle)",
      "Better Auth",
      "Vitest",
      "Playwright",
      "Vercel",
    ],
    githubUrl: "https://github.com/richardlancs/marketlab",
    liveUrl: "https://marketlab-theta.vercel.app",
    // Captured from the live demo
    screenshots: [
      {
        src: "/projects/marketlab/dashboard.png",
        alt: "MarketLab dashboard with market index cards and an Apple stock chart",
        width: 1440,
        height: 900,
      },
      {
        src: "/projects/marketlab/backtest.png",
        alt: "MarketLab backtester comparing a moving-average crossover strategy with buy and hold on AAPL",
        width: 1440,
        height: 900,
      },
      {
        src: "/projects/marketlab/screener.png",
        alt: "MarketLab stock screener with preset filters and a table of stocks",
        width: 1440,
        height: 900,
      },
    ],
  },
  {
    title: "Scrollganizer",
    summary: "A Chrome side-panel extension that makes saved TikTok videos and photo posts searchable.",
    role: "Software developer on a team of three.",
    features: [
      "Builds a library of saved videos and photo posts, right in the browser.",
      "Search by caption, creator, hashtag, or collection instead of scrolling through Favorites.",
      "The library stays on the user's device, and can be exported or imported as JSON.",
    ],
    technologies: [
      "TypeScript",
      "Preact",
      "SQLite (WebAssembly)",
      "WXT",
      "Chrome Extensions (Manifest V3)",
      "Vitest",
      "Playwright",
    ],
    githubUrl: "https://github.com/richardlancs/Scrollganize",
    // From the project repository's docs/screenshots (sample data)
    screenshots: [
      {
        src: "/projects/scrollganizer/panel-results-light.png",
        alt: "Scrollganizer side panel searching saved videos for the category “travel”, with 18 results",
        width: 420,
        height: 900,
      },
      {
        src: "/projects/scrollganizer/panel-grid-light.png",
        alt: "Scrollganizer result cards with the matching words highlighted",
        width: 420,
        height: 900,
      },
      {
        src: "/projects/scrollganizer/panel-results-dark.png",
        alt: "Scrollganizer side panel in the dark theme",
        width: 420,
        height: 900,
      },
    ],
  },
  {
    title: "Codebase Puzzles",
    summary: "A LeetCode-style site where every puzzle is set inside a real open-source repository.",
    role: "Building it with one other developer.",
    features: [
      "100 puzzles across 15 TypeScript and Python repositories, including FastAPI, Flask, Zod and Hono, each pinned to a commit.",
      "Read the code in a browser IDE and answer by clicking on symbols, files or lines.",
      "The server grades every answer by exact ID.",
      "A Python pipeline indexes each repository with SCIP, building the code index the puzzles and the grader rely on.",
    ],
    contributions: [
      "Added browsing by difficulty and topic.",
      "Wrote 15 of the puzzles, and the difficulty rules.",
      "Fixed grading, rate-limiting and macOS setup issues.",
    ],
    technologies: [
      "TypeScript",
      "Next.js",
      "React",
      "Monaco Editor",
      "PostgreSQL",
      "Python (SCIP code indexing)",
      "Zod",
      "Vitest",
      "Playwright",
    ],
    githubUrl: "https://github.com/anshiwang8/codespaceleetcode",
    // Captured from a local run; the site isn't deployed yet
    screenshots: [
      {
        src: "/projects/codebase-puzzles/puzzle.png",
        alt: "A Codebase Puzzles trace puzzle in Hono: the prompt, a file tree and outline, the code viewer, and the answer tray with Hono.request added",
        width: 1440,
        height: 900,
      },
      {
        src: "/projects/codebase-puzzles/list.png",
        alt: "The Codebase Puzzles list: 100 puzzles split by difficulty, with filters for type, topic and repo",
        width: 1440,
        height: 900,
      },
    ],
  },
  {
    title: "GaragePoker",
    summary: "A free real-time poker web app for private home games: share a link and friends join, with no accounts.",
    role: "Contributor to a project started by another developer.",
    features: [
      "Eight variants, from Hold'em and Omaha to Short Deck, with bomb pots, double board and run it twice.",
      "A pure TypeScript engine, tested on every five-card hand and 100,000 random ones.",
      "One Cloudflare Durable Object per table runs the game and sends each player only the cards they may see.",
      "A provably fair shuffle, and a ledger that works out who owes whom at the end.",
    ],
    contributions: [
      "Designed and built Tic-Tac-Toe Hold'em: a 3×3 board, played with both hole cards and one row, column or diagonal.",
      "Made the board's shape a per-variant setting, so dealing, replays and rabbit hunt all handle the grid.",
      "Fixed a bug that left the table blank on phones for viewers without a seat.",
      "Not yet released: a product audit and six stages of fixes from it, among them reliability, chat and hand history.",
    ],
    technologies: [
      "TypeScript",
      "Next.js",
      "React",
      "Tailwind CSS",
      "Cloudflare Workers (Durable Objects)",
      "WebSockets",
      "Zod",
      "Vitest",
      "fast-check",
    ],
    githubUrl: "https://github.com/anshiwang8/garagepoker",
    liveUrl: "https://garagepoker-flax.vercel.app",
    // From a local build that includes the unreleased improvements
    screenshots: [
      {
        src: "/projects/garagepoker/tictactoe.jpg",
        alt: "A Tic-Tac-Toe Hold'em showdown on a phone: the 3×3 board, with the winning line's cards outlined",
        width: 390,
        height: 844,
      },
      {
        src: "/projects/garagepoker/create-table.jpg",
        alt: "Creating a private GaragePoker table: quick starts, the eight games, blinds and seats",
        width: 1440,
        height: 900,
      },
      {
        src: "/projects/garagepoker/table.jpg",
        alt: "A GaragePoker table on the flop, with the chat sidebar open beside it",
        width: 1440,
        height: 900,
      },
    ],
  },
];

export const experience: Experience[] = [
  {
    role: "Machine Learning Intern",
    organization: "FlyRank AI",
    location: "Remote",
    startDate: "Oct. 2026",
    endDate: "Present",
    highlights: [
      "Working through FlyRank AI's self-paced Machine Learning track: technical assignments and practical AI/ML coursework.",
      "Building skills in machine learning workflows, reproducible Python analysis, and model evaluation.",
      "Working toward a reviewed capstone project.",
    ],
  },
  {
    role: "Autonomous Programming Lead",
    organization: "Drive Gears #20261, FIRST Tech Challenge",
    startDate: "2024",
    highlights: [
      "Developed the robot's autonomous programs in Java with Android Studio, so it could run its routines without driver input.",
      "Structured the control logic as a sequence of actions, tuning movement order and timing to coordinate the robot.",
      "Tested on the physical robot and debugged iteratively, adjusting the code to match how it actually behaved.",
    ],
  },
  {
    role: "Honours Computer Science (Co-op)",
    organization: "University of Waterloo",
    location: "Waterloo, ON",
    startDate: "2026",
    endDate: "Present",
    highlights: [
      "Expected graduation: 2031.",
      "Awards: John Platter Scholarship; University of Waterloo Merit Scholarship.",
      "Focus: data structures and algorithms, object-oriented programming, and full-stack development.",
    ],
  },
];

export const interests: Interest[] = [
  {
    name: "Basketball",
    scene: "basketball",
    description:
      "One of the ways I stay active, and an easy way to get my competitive side out.",
  },
  {
    name: "Badminton",
    scene: "badminton",
    description:
      "My other court sport. Rallies are fast, so it comes down to footwork and reading where the shuttle is going next.",
  },
  {
    name: "Chess",
    scene: "chess",
    description:
      "A slower kind of competition: planning a few moves ahead and working out what the other player is after.",
  },
  {
    name: "Poker",
    scene: "poker",
    description:
      "Poker has taught me to think in probabilities and to make calm decisions with incomplete information.",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    category: "Languages",
    skills: ["Python", "Java", "C", "C++", "HTML / CSS / JavaScript"],
  },
  {
    category: "Tools",
    skills: ["Git", "GitHub", "VS Code", "Docker", "CI/CD"],
  },
  {
    category: "Current focus",
    skills: [
      "Data structures & algorithms",
      "Object-oriented programming",
      "Full-stack development",
      "AI / machine learning",
    ],
  },
];
