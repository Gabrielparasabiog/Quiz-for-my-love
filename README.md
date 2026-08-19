# Quiz-for-my-love

A small, static board-exam practice rumble made for My Love. It is intentionally playful and personal: one timed multiple-choice question at a time, immediate supportive feedback, retry scheduling, and a rotating encouragement rail with World English Bible excerpts.

## What is included

- 231 multiple-choice questions imported from the supplied test-bank PDF, with the PDF wording and choices preserved.
- A 60-second timer for every attempt.
- Every question allows at most two attempts. A first wrong or timed-out attempt returns after ten other attempts when there are enough available questions; with fewer remaining questions, it returns after the current available queue is exhausted. A second miss settles that question as not mastered so the session cannot loop forever.
- The rumble ends when every question is either mastered or settled after its two attempts.
- Shuffled question and answer order, without changing answer identity.
- Mastered count, first-attempt accuracy, retries, current streak, and best streak.
- Exactly 150 locally bundled World English Bible verse cards with original Tagalog encouragement notes, rotated without repetition during a session.
- A rotating collection of sweet notes from —Gab, with a full missed-first review at the end showing each question, attempts, and the final result.
- Responsive desktop/mobile layout, keyboard choice shortcuts (`1`–`6`), visible focus states, and reduced-motion support.
- Incorrect attempts show supportive feedback without marking or naming the correct choice in the game UI.
- No account, cookies, analytics, backend, sound, or saved progress.

## Run it locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For a production-style check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Review or replace the question bank

Edit [`src/data/questions.ts`](./src/data/questions.ts). Each question must have:

- a unique stable `id`;
- a `category` and non-empty `prompt`;
- two to six choices with unique choice IDs;
- a `correctChoiceId` that matches exactly one choice ID.

The current bank was generated from `test bank .pdf`; only PDF layout line wrapping was joined. The app validates the bank at startup and shows a friendly content-check screen rather than starting with invalid content. Run the checks above before committing a replacement bank.

## Replace or review verse cards

Verse cards live in [`src/data/verses.ts`](./src/data/verses.ts). The release validator requires exactly 150 unique references, non-empty WEB text, and an original Tagalog note for every card. The verse collection is separate from scoring and retry logic.

## GitHub Pages

The Vite base path is `/Quiz-for-my-love/`. The workflow at [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) runs lint, type checking, tests, and the production build before deploying `dist` to GitHub Pages from `main`.

After changing content:

```bash
git add .
git commit -m "Update quiz question bank"
git push origin main
```

GitHub Actions will publish the new build after the checks pass. The intended public URL is:

`https://gabrielparasabiog.github.io/Quiz-for-my-love/`

## Content and privacy note

This is a public static site. The answer key must remain in the browser bundle for offline scoring, but the game UI never reveals it after an incorrect attempt. Do not add private names, personal photographs, credentials, API keys, or other secrets to the repository.
