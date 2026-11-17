This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI course generator (A-EduNet)

Admins open **Admin → AI course generator**, describe a course (topic, audience, level, number of lessons) and press
**Generate course**. Based on AutoMode AI's A-EduNet design, it runs in phases:

1. **Curriculum** – Claude plans the modules and lessons.
2. **Lessons** – each lesson's text, a 5-question quiz and (where it fits) an HTML/CSS/JavaScript lab are written in parallel.
3. **Packaging** – everything is saved in one go as a **draft course**: hidden from the catalogue and closed to enrolments
   until an admin reviews it and presses **Publish**. "Publish automatically" is off unless ticked on the form.

Every course has a **PDF handbook** at `/api/courses/<id>/handbook` (admins and the course's instructors get every lesson;
enrolled learners get published lessons).

- Needs `ANTHROPIC_API_KEY`. Model: `COURSE_GENERATE_MODEL` in `src/lib/anthropic.ts` (`claude-opus-5-5`; switch to
  `claude-sonnet-5-5` to roughly halve the cost). The admin page shows an approximate cost per run.
- `COURSE_GENERATE_DAILY_LIMIT` (default 5) caps runs per admin per 24 hours; one run at a time per admin.
- Runs in the background on the server; a run interrupted by a restart or deploy is marked failed after 15 minutes.
- Tests: `npm test` (uses a fake Claude and a **throwaway** `DATABASE_URL`; it writes and deletes rows).
