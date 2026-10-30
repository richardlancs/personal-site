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
  description: string;
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
  headline: "Computer Science Student at the University of Waterloo",
  intro:
    "Lately I've been building MarketLab, a stock market simulator with paper trading and a strategy backtester, and, with a team of three, Scrollganizer, a Chrome extension that makes saved TikToks searchable. Next I'm digging into AI and machine learning, and looking for a software engineering internship or co-op.",
  emails: [
    { label: "School email", address: "r6lan@uwaterloo.ca" },
    { label: "Personal email", address: "lanrichard159@gmail.com" },
  ],
  githubUrl: "https://github.com/richardlancs",
  linkedinUrl: "https://www.linkedin.com/in/richard-lan-0312072a8",
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

export const about: string[] = [
  "I'm a Computer Science student at the University of Waterloo, interested in software development, artificial intelligence, and building practical projects.",
  "Outside of code, I play badminton and basketball, lift weights, and play poker. They keep me active and competitive, and poker especially has taught me to think in probabilities and make calm decisions with incomplete information.",
  "I use GitHub to document what I'm learning and to share the projects I build throughout university.",
];

export const projects: Project[] = [
  {
    title: "MarketLab",
    description:
      "A stock market web app that runs on simulated prices: a dashboard and screener for about 95 US stocks, paper trading, portfolio risk analytics, and a strategy backtester with walk-forward testing. It also has price alerts with push notifications, monthly trading competitions, and short lessons with quizzes. Heavier analytics run in a separate Python service.",
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
    description:
      "A Chrome side-panel extension I worked on as a software developer on a team of three. It builds a searchable library of saved TikTok videos and photo posts in the browser, so they can be found by caption, creator, hashtag, or collection instead of scrolling through Favorites. The library stays on the user's device and can be exported or imported as JSON.",
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
];

export const experience: Experience[] = [
  {
    role: "Machine Learning Intern",
    organization: "FlyRank AI",
    location: "Remote",
    startDate: "Oct. 2026",
    endDate: "Present",
    highlights: [
      "Participating in FlyRank AI's self-paced Machine Learning track, completing technical assignments and practical AI/ML coursework.",
      "Developing skills in machine learning workflows, reproducible Python analysis, and model evaluation while working toward a reviewed capstone project.",
    ],
  },
  {
    role: "Autonomous Programming Lead",
    organization: "Drive Gears #20261, FIRST Tech Challenge",
    startDate: "2024",
    highlights: [
      "Developed Java-based autonomous robot programs in Android Studio, implementing ordered movement routines and task sequences to operate without driver input.",
      "Structured autonomous control logic into sequential actions, refining movement order and timing parameters to coordinate robot behavior during autonomous operation.",
      "Tested and debugged Java autonomous routines on the physical robot, identifying sequencing and timing issues and iteratively adjusting code based on observed behavior.",
    ],
  },
  {
    role: "Honours Computer Science (Co-op)",
    organization: "University of Waterloo",
    location: "Waterloo, ON",
    startDate: "2026",
    endDate: "Present",
    highlights: [
      "Expected to finish in 2031.",
      "Awards: John Platter Scholarship; University of Waterloo Merit Scholarship.",
      "Focusing on data structures and algorithms, object-oriented programming, and full-stack development.",
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
