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
    audience: "Learners who want to design products people actually enjoy using, not just pretty screens.",
    outcomes: [
      "Understanding users before you design for them",
      "Wireframing and prototyping real screens",
      "Visual design fundamentals: layout, type, and color",
      "Presenting and defending your design decisions",
    ],
  },
] as const;

export type Course = (typeof courses)[number];

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}
