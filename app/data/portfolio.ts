// All of the site's content lives in this one file.
// To update your portfolio, edit the values below — you shouldn't need to
// touch the components. Anything in [square brackets] is a placeholder.

export type Project = {
  title: string;
  description: string;
  technologies: string[];
  githubUrl: string;
  liveUrl?: string; // optional: leave it out if there is no live demo
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

export const profile = {
  name: "Richard Lan",
  headline: "Computer Science Student at the University of Waterloo",
  intro:
    "I'm interested in software development, AI, and the web, and I'm looking for software engineering internship and co-op opportunities.",
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
  },
];

export const experience: Experience[] = [
  {
    role: "Software Developer",
    organization: "Scrollganizer (team project)",
    startDate: "2026",
    highlights: [
      "Developed a Chrome side-panel extension with a team of three that lets people search their saved TikTok posts by caption, creator, hashtag, or collection.",
      "Built with TypeScript, Preact, and SQLite (WebAssembly), and tested with Vitest and Playwright.",
    ],
  },
  {
    role: "Computer Science Student",
    organization: "University of Waterloo",
    location: "Waterloo, ON",
    startDate: "2026",
    endDate: "Present",
    highlights: [
      "Focusing on data structures and algorithms, object-oriented programming, and full-stack development.",
      "Exploring AI and machine learning alongside core computer science fundamentals.",
    ],
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
