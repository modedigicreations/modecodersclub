// Word, sentence and passage banks for the reading and writing tutor.
// Plain, familiar Nigerian contexts; short sentences for early readers.

/** Picture words for beginning sounds (emoji + word). */
export const PICTURE_WORDS: { word: string; emoji: string }[] = [
  { word: "ant", emoji: "🐜" }, { word: "apple", emoji: "🍎" }, { word: "ball", emoji: "⚽" }, { word: "banana", emoji: "🍌" },
  { word: "bag", emoji: "👜" }, { word: "cat", emoji: "🐱" }, { word: "car", emoji: "🚗" }, { word: "cup", emoji: "🥤" },
  { word: "dog", emoji: "🐶" }, { word: "duck", emoji: "🦆" }, { word: "egg", emoji: "🥚" }, { word: "fish", emoji: "🐟" },
  { word: "fan", emoji: "🪭" }, { word: "goat", emoji: "🐐" }, { word: "hat", emoji: "👒" }, { word: "hen", emoji: "🐔" },
  { word: "house", emoji: "🏠" }, { word: "jug", emoji: "🫗" }, { word: "key", emoji: "🔑" }, { word: "lion", emoji: "🦁" },
  { word: "mango", emoji: "🥭" }, { word: "moon", emoji: "🌙" }, { word: "net", emoji: "🥅" }, { word: "nose", emoji: "👃" },
  { word: "orange", emoji: "🍊" }, { word: "pen", emoji: "🖊️" }, { word: "pig", emoji: "🐷" }, { word: "queen", emoji: "👸" },
  { word: "rain", emoji: "🌧️" }, { word: "rat", emoji: "🐀" }, { word: "sun", emoji: "☀️" }, { word: "star", emoji: "⭐" },
  { word: "tree", emoji: "🌳" }, { word: "top", emoji: "🔝" }, { word: "umbrella", emoji: "☂️" }, { word: "van", emoji: "🚐" },
  { word: "water", emoji: "💧" }, { word: "yam", emoji: "🍠" }, { word: "zebra", emoji: "🦓" }, { word: "bed", emoji: "🛏️" },
];

/** Consonant-vowel-consonant words with a picture, for blending and spelling. */
export const CVC_WORDS: { word: string; emoji: string }[] = [
  { word: "cat", emoji: "🐱" }, { word: "dog", emoji: "🐶" }, { word: "pig", emoji: "🐷" }, { word: "hen", emoji: "🐔" },
  { word: "sun", emoji: "☀️" }, { word: "bus", emoji: "🚌" }, { word: "bed", emoji: "🛏️" }, { word: "cup", emoji: "🥤" },
  { word: "hat", emoji: "👒" }, { word: "fan", emoji: "🪭" }, { word: "pen", emoji: "🖊️" }, { word: "box", emoji: "📦" },
  { word: "bag", emoji: "👜" }, { word: "net", emoji: "🥅" }, { word: "fox", emoji: "🦊" }, { word: "rat", emoji: "🐀" },
  { word: "yam", emoji: "🍠" }, { word: "map", emoji: "🗺️" }, { word: "jug", emoji: "🫗" }, { word: "van", emoji: "🚐" },
  { word: "web", emoji: "🕸️" }, { word: "bat", emoji: "🦇" }, { word: "pot", emoji: "🍲" }, { word: "leg", emoji: "🦵" },
];

/** High-frequency sight words, easiest first. */
export const SIGHT_WORDS = [
  "the", "and", "is", "it", "in", "to", "a", "I", "you", "he", "she", "we", "my", "at", "on", "can", "go", "see",
  "look", "come", "play", "said", "was", "have", "they", "are", "with", "this", "that", "what", "where", "when",
  "there", "their", "one", "two", "three", "here", "little", "down", "up", "big", "like", "for", "of", "do", "out",
  "school", "mother", "father", "friend", "because", "would", "could", "about", "people", "water", "after",
] as const;

/** Spelling words grouped by difficulty (1 = short, 3 = harder). */
export const SPELLING_WORDS: Record<1 | 2 | 3, string[]> = {
  1: ["cat", "dog", "sun", "bed", "cup", "hen", "pig", "box", "bus", "red", "big", "run", "sit", "hot", "map"],
  2: ["fish", "ship", "shop", "chair", "rain", "train", "green", "tree", "boat", "goat", "school", "book", "night", "light", "friend"],
  3: ["because", "beautiful", "market", "teacher", "village", "family", "different", "important", "together", "brother", "sister", "morning", "afternoon", "football", "kitchen"],
};

/** Rhyming families: words in one family rhyme with each other. */
export const RHYME_FAMILIES: string[][] = [
  ["cat", "hat", "mat", "rat", "bat", "sat"],
  ["dog", "log", "fog", "jog", "frog"],
  ["pen", "hen", "ten", "men", "den"],
  ["sun", "run", "fun", "bun"],
  ["pig", "big", "dig", "wig", "fig"],
  ["cake", "lake", "make", "take", "bake"],
  ["night", "light", "right", "bright", "sight"],
  ["rain", "train", "pain", "main", "chain"],
  ["book", "look", "cook", "hook"],
  ["ball", "tall", "wall", "call", "fall"],
];

/** Sentences for word-order practice (no final punctuation in the tiles). */
export const ORDER_SENTENCES: string[] = [
  "The cat is on the mat",
  "I like to eat rice",
  "My mother goes to the market",
  "We play football after school",
  "The sun is very hot today",
  "Tunde has a red bag",
  "The goat is eating grass",
  "Ada reads a book every night",
  "The bus is full of people",
  "Please close the door",
  "My father drives a blue car",
  "The children sing in the morning",
  "We drink clean water",
  "The teacher writes on the board",
  "I help my sister with her homework",
  "The rain fell all night",
];

/** Sentences for capitals and full stops (the correct form). */
export const PUNCTUATION_SENTENCES: string[] = [
  "My name is Ngozi.",
  "We live in Lagos.",
  "Musa has two brothers.",
  "The shop opens on Monday.",
  "Is the food ready?",
  "I visited Abuja with my aunt.",
  "Emeka plays the drum.",
  "Where is my pencil?",
  "The Niger is a long river.",
  "We go to church on Sunday.",
  "Amina and Bisi are friends.",
  "Can you help me, please?",
];

/** Parts of speech: a sentence with a word of each kind. */
export const GRAMMAR_SENTENCES: { sentence: string; noun: string; verb: string; adjective: string }[] = [
  { sentence: "The tall boy runs to school.", noun: "boy", verb: "runs", adjective: "tall" },
  { sentence: "A small dog barks at night.", noun: "dog", verb: "barks", adjective: "small" },
  { sentence: "My kind teacher reads a story.", noun: "teacher", verb: "reads", adjective: "kind" },
  { sentence: "The hungry goat eats grass.", noun: "goat", verb: "eats", adjective: "hungry" },
  { sentence: "The big lorry carries yams.", noun: "lorry", verb: "carries", adjective: "big" },
  { sentence: "A happy girl sings loudly.", noun: "girl", verb: "sings", adjective: "happy" },
  { sentence: "The old man sells oranges.", noun: "man", verb: "sells", adjective: "old" },
  { sentence: "The brown hen lays eggs.", noun: "hen", verb: "lays", adjective: "brown" },
];

/** Tense and plural fill-in-the-blank items. */
export const BLANK_ITEMS: { sentence: string; answer: string; options: string[]; why: string }[] = [
  { sentence: "Yesterday I ___ to the market.", answer: "went", options: ["went", "go", "goes", "going"], why: "\"Yesterday\" means the past, so we use \"went\"." },
  { sentence: "She ___ her homework every day.", answer: "does", options: ["does", "do", "did", "doing"], why: "\"She\" with \"every day\" takes \"does\"." },
  { sentence: "Last week we ___ a football match.", answer: "watched", options: ["watched", "watch", "watches", "watching"], why: "\"Last week\" is in the past: \"watched\"." },
  { sentence: "There are three ___ on the table.", answer: "cups", options: ["cups", "cup", "cupes", "cup's"], why: "More than one cup: add -s to make \"cups\"." },
  { sentence: "The two ___ are playing.", answer: "children", options: ["children", "childs", "child", "childrens"], why: "The plural of \"child\" is \"children\"." },
  { sentence: "I have five ___ in my bag.", answer: "boxes", options: ["boxes", "boxs", "box", "boxies"], why: "Words ending in -x add -es: \"boxes\"." },
  { sentence: "Tomorrow they ___ visit their grandmother.", answer: "will", options: ["will", "did", "was", "were"], why: "\"Tomorrow\" is the future, so we use \"will\"." },
  { sentence: "He ___ eating when I arrived.", answer: "was", options: ["was", "were", "is", "be"], why: "One person in the past: \"was\"." },
  { sentence: "The ___ are flying in the sky.", answer: "birds", options: ["birds", "bird", "birdes", "bird's"], why: "More than one bird: \"birds\"." },
  { sentence: "We ___ rice for lunch yesterday.", answer: "ate", options: ["ate", "eat", "eats", "eating"], why: "The past of \"eat\" is \"ate\"." },
];

/** Synonym and antonym pairs. */
export const VOCAB: { word: string; same: string; opposite: string; others: string[] }[] = [
  { word: "big", same: "large", opposite: "small", others: ["fast", "happy", "late"] },
  { word: "happy", same: "glad", opposite: "sad", others: ["tall", "cold", "early"] },
  { word: "fast", same: "quick", opposite: "slow", others: ["kind", "wet", "loud"] },
  { word: "begin", same: "start", opposite: "finish", others: ["carry", "sleep", "laugh"] },
  { word: "shout", same: "yell", opposite: "whisper", others: ["climb", "cook", "push"] },
  { word: "hot", same: "warm", opposite: "cold", others: ["rich", "brave", "thin"] },
  { word: "brave", same: "bold", opposite: "afraid", others: ["sweet", "heavy", "dry"] },
  { word: "clever", same: "smart", opposite: "foolish", others: ["green", "noisy", "round"] },
  { word: "difficult", same: "hard", opposite: "easy", others: ["bright", "early", "soft"] },
  { word: "ancient", same: "old", opposite: "modern", others: ["angry", "empty", "loud"] },
];

export type Passage = {
  title: string;
  level: 1 | 2;
  text: string;
  questions: { q: string; answer: string; options: string[] }[];
};

/** Short passages with questions. Level 1 = literal recall, level 2 = inference. */
export const PASSAGES: Passage[] = [
  {
    title: "Ada's Garden",
    level: 1,
    text: "Ada has a small garden behind her house. She grows tomatoes, peppers and okra. Every morning she waters the plants before she goes to school. On Saturday she picks the ripe tomatoes and gives some to her neighbour, Mama Bisi.",
    questions: [
      { q: "Where is Ada's garden?", answer: "Behind her house", options: ["Behind her house", "At school", "At the market", "Near the river"] },
      { q: "When does Ada water the plants?", answer: "Every morning", options: ["Every morning", "Every night", "On Sunday", "After lunch"] },
      { q: "Who gets some tomatoes?", answer: "Mama Bisi", options: ["Mama Bisi", "Her teacher", "Her brother", "The driver"] },
    ],
  },
  {
    title: "The School Bus",
    level: 1,
    text: "The school bus is yellow. It comes at seven o'clock every morning. Tunde and his sister wait for it at the junction. The driver, Mr Okon, always smiles and says, \"Good morning, children!\"",
    questions: [
      { q: "What colour is the school bus?", answer: "Yellow", options: ["Yellow", "Blue", "Red", "Green"] },
      { q: "What time does the bus come?", answer: "Seven o'clock", options: ["Seven o'clock", "Eight o'clock", "Six o'clock", "Nine o'clock"] },
      { q: "What is the driver's name?", answer: "Mr Okon", options: ["Mr Okon", "Mr Musa", "Tunde", "Mr Bello"] },
    ],
  },
  {
    title: "Market Day",
    level: 1,
    text: "On market day, Musa goes with his father to sell yams. They leave home very early, when it is still dark. The market is busy and noisy. By noon they have sold all the yams, and Musa's father buys him a cold drink.",
    questions: [
      { q: "What do Musa and his father sell?", answer: "Yams", options: ["Yams", "Oranges", "Fish", "Shoes"] },
      { q: "When do they leave home?", answer: "Very early, when it is dark", options: ["Very early, when it is dark", "At noon", "In the evening", "After school"] },
      { q: "What does Musa get at the end?", answer: "A cold drink", options: ["A cold drink", "A new shirt", "A book", "Some money"] },
    ],
  },
  {
    title: "The Rain",
    level: 1,
    text: "Dark clouds covered the sky. Then the rain began to fall. Ngozi ran inside and closed the windows. She sat by the door and listened to the rain on the roof. When it stopped, she saw a rainbow over the trees.",
    questions: [
      { q: "What did Ngozi close?", answer: "The windows", options: ["The windows", "Her book", "The gate", "Her eyes"] },
      { q: "What did she see when the rain stopped?", answer: "A rainbow", options: ["A rainbow", "The moon", "A bird", "Her friend"] },
      { q: "What covered the sky?", answer: "Dark clouds", options: ["Dark clouds", "Smoke", "Birds", "Stars"] },
    ],
  },
  {
    title: "The Lost Pencil",
    level: 2,
    text: "Emeka looked everywhere for his new pencil. It was not in his bag or under his desk. He felt like crying because the test was about to start. Then Zainab tapped his shoulder and held out a pencil. \"You can use my spare one,\" she said. Emeka smiled for the first time that morning.",
    questions: [
      { q: "Why did Emeka feel like crying?", answer: "He needed a pencil for the test", options: ["He needed a pencil for the test", "He was hungry", "He was late for school", "His friend was sick"] },
      { q: "What kind of person is Zainab?", answer: "Kind and helpful", options: ["Kind and helpful", "Rude", "Lazy", "Shy and afraid"] },
      { q: "How did Emeka feel at the end?", answer: "Happy and relieved", options: ["Happy and relieved", "Angry", "Still sad", "Tired"] },
    ],
  },
  {
    title: "The Football Match",
    level: 2,
    text: "The score was one-all and there was only one minute left. Ife had the ball near the goal. She could shoot, or pass to Chidi who was standing free. Ife passed the ball. Chidi kicked it hard into the net, and the whole team ran to hug Ife first.",
    questions: [
      { q: "Why did the team hug Ife first?", answer: "Her pass helped them score", options: ["Her pass helped them score", "She was the captain", "She scored the goal", "She was hurt"] },
      { q: "What was the final score likely to be?", answer: "Two-one", options: ["Two-one", "One-all", "Zero-zero", "Three-two"] },
      { q: "What does this story show about Ife?", answer: "She thinks about the team", options: ["She thinks about the team", "She is selfish", "She cannot play well", "She is afraid of the ball"] },
    ],
  },
  {
    title: "Grandma's Visit",
    level: 2,
    text: "Bisi cleaned her room twice and helped her mother cook jollof rice. She kept looking out of the window at the road. When a taxi stopped at the gate, Bisi ran outside shouting, \"She's here!\" Her grandmother climbed out, smiling, with a basket of fruit.",
    questions: [
      { q: "Why did Bisi keep looking at the road?", answer: "She was waiting for her grandmother", options: ["She was waiting for her grandmother", "She was bored", "She heard a noise", "She wanted a taxi"] },
      { q: "How did Bisi feel about the visit?", answer: "Excited", options: ["Excited", "Worried", "Angry", "Sleepy"] },
      { q: "Who came in the taxi?", answer: "Bisi's grandmother", options: ["Bisi's grandmother", "Bisi's teacher", "Bisi's father", "A stranger"] },
    ],
  },
  {
    title: "Saving Water",
    level: 2,
    text: "In the dry season, the tap in Amina's street often stops running. Her family keeps water in big drums. Amina has learnt to turn off the tap while she brushes her teeth, and to use the water from washing rice to water the plants. \"Every drop counts,\" her father says.",
    questions: [
      { q: "Why does Amina's family keep water in drums?", answer: "The tap often stops in the dry season", options: ["The tap often stops in the dry season", "They like big drums", "The water is cold", "They sell water"] },
      { q: "What does \"Every drop counts\" mean?", answer: "Even small amounts of water matter", options: ["Even small amounts of water matter", "Count the drops of water", "Water is free", "Drink a lot of water"] },
      { q: "Which is a way Amina saves water?", answer: "Turning off the tap while brushing", options: ["Turning off the tap while brushing", "Leaving the tap open", "Washing the car daily", "Pouring water away"] },
    ],
  },
];

/** Writing prompts: short sentences (level 1) and paragraphs (level 2). */
export const WRITING_PROMPTS: { level: 1 | 2; prompt: string }[] = [
  { level: 1, prompt: "Write one sentence about your favourite food." },
  { level: 1, prompt: "Write one sentence about your best friend." },
  { level: 1, prompt: "Write one sentence about what you did yesterday." },
  { level: 1, prompt: "Write one sentence about an animal you like." },
  { level: 1, prompt: "Write one sentence about your school." },
  { level: 2, prompt: "Describe your home or your street to someone who has never seen it." },
  { level: 2, prompt: "Write about a day you felt very proud of yourself." },
  { level: 2, prompt: "Explain how to make your favourite meal, step by step." },
  { level: 2, prompt: "What job would you like to do when you grow up, and why?" },
  { level: 2, prompt: "Write a short story that begins: \"The power went off just as...\"" },
];
