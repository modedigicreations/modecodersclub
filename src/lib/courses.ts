export const courses = [
  {
    slug: "java-programming",
    name: "Java Programming",
    category: "Programming",
    level: "Start with the fundamentals",
    description:
      "Explore core Java concepts, object-oriented programming, and practical software projects.",
    icon: "{ }",
    color: "orange",
    duration: "10 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "First-time programmers and anyone who wants a solid foundation in a widely-used language.",
    outcomes: [
      "Variables, control flow, and functions, from first principles",
      "Object-oriented programming: classes, objects, inheritance, interfaces",
      "Reading and debugging real Java code, not just writing it",
      "A small original project you build and present at the end",
    ],
  },
  {
    slug: "full-stack-web-development",
    name: "Full Stack Web Development",
    category: "Web development",
    level: "From front end to back end",
    description:
      "Learn how the web fits together, from HTML and CSS through JavaScript and server-side applications.",
    icon: "</>",
    color: "mint",
    duration: "12 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "Learners who want to build and ship real websites and web apps, start to finish.",
    outcomes: [
      "HTML, CSS, and modern JavaScript fundamentals",
      "Building interactive front ends and working with APIs",
      "Server-side basics: routes, data, and simple back ends",
      "Deploying a project the rest of the world can actually visit",
    ],
  },
  {
    slug: "data-science",
    name: "Data Science",
    category: "Data and AI",
    level: "Find the story in data",
    description:
      "Get introduced to data analysis, visualization, statistics, and machine learning concepts.",
    icon: "01",
    color: "lavender",
    duration: "10 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "Curious minds who like numbers, patterns, and asking \"what does this actually mean?\"",
    outcomes: [
      "Cleaning and exploring real datasets",
      "Telling a clear story through charts and visualization",
      "Core statistics concepts, explained without the jargon",
      "A first hands-on look at machine learning models",
    ],
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    category: "Security",
    level: "Think about safety online",
    description:
      "Build security awareness and learn the foundations of responsible digital safety.",
    icon: "⌘",
    color: "blue",
    duration: "8 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "Anyone who wants to understand how systems get attacked, and how to defend them responsibly.",
    outcomes: [
      "How common attacks actually work, and how to recognize them",
      "The basics of networks, passwords, and safe digital habits",
      "Thinking like a defender, with an emphasis on ethics",
      "A guided look at how real security teams operate",
    ],
  },
  {
    slug: "ui-ux-design",
    name: "UI/UX Design",
    category: "Product design",
    level: "Design with people in mind",
    description:
      "Explore how research, wireframes, and visual design come together to make useful digital products.",
    icon: "◉",
    color: "pink",
    duration: "8 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "Learners who want to design products people actually enjoy using, not just pretty screens.",
    outcomes: [
      "Understanding users before you design for them",
      "Wireframing and prototyping real screens",
      "Visual design fundamentals: layout, type, and color",
      "Presenting and defending your design decisions",
    ],
  },
  {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    category: "Artificial Intelligence",
    level: "Think, then build with AI",
    description:
      "Understand how modern AI and machine learning actually work, then use that understanding to build real, practical projects.",
    icon: "AI",
    color: "teal",
    duration: "10 weeks, 2 sessions a week",
    price: "₦5,000 every 6 months",
    audience: "Learners curious about how AI tools actually work, not just how to prompt them.",
    outcomes: [
      "How machine learning models learn from data, explained in plain language",
      "Hands-on practice with real AI tools and APIs",
      "Thinking critically about AI: bias, limits, and responsible use",
      "A small AI-powered project you build and demo",
    ],
  },
] as const;

export type Course = (typeof courses)[number];

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

// Shorter, free, single-session items — skills checks and software basics,
// not full learning paths. Kept separate from `courses` because they don't
// share its shape (no weeks-long duration, no multi-point outcomes list).
export const freeResources = [
  {
    slug: "computational-thinking-assessment",
    name: "Computational Thinking: Baseline Diagnostic Assessment",
    category: "Computational Thinking",
    description:
      "A short diagnostic that measures where you're starting from — patterns, logic, and breaking problems into steps — before you begin a learning path.",
    icon: "✓",
    color: "mint",
    time: "30–45 minutes",
  },
  {
    slug: "scratch-exam",
    name: "Scratch Exam",
    category: "Computational Thinking",
    description:
      "A hands-on assessment in Scratch for learners getting their first introduction to block-based programming.",
    icon: "✦",
    color: "orange",
    time: "1 hour",
  },
  {
    slug: "microsoft-word",
    name: "Microsoft Word",
    category: "Digital Literacy",
    description:
      "Practical, exam-style practice for core Microsoft Word skills: formatting, documents, and everyday office tasks.",
    icon: "W",
    color: "blue",
    time: "Self-paced",
  },
  {
    slug: "microsoft-excel",
    name: "Microsoft Excel",
    category: "Digital Literacy",
    description:
      "Practical, exam-style practice for core Microsoft Excel skills: spreadsheets, formulas, and everyday office tasks.",
    icon: "X",
    color: "lavender",
    time: "Self-paced",
  },
] as const;

export type FreeResource = (typeof freeResources)[number];
