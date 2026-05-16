# Do

Next.js MVP for discovering live Seoul and Tokyo events that are useful for gentle social-skill practice.

## Run locally

```bash
npm install
npm run refresh:events
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and fill in keys when available.

- `KTO_SERVICE_KEY`: Korea Tourism Organization / TourAPI service key.
- `SEOUL_OPEN_DATA_KEY`: Seoul Open Data Plaza key for `culturalEventInfo`.
- `CONNPASS_API_KEY`: connpass API key for Tokyo community events.
- `EVENT_REFRESH_TOKEN`: optional token required by `POST /api/events/refresh`.
- `AI_PROVIDER_API_KEY`: optional OpenAI-compatible key for AI summaries and ranking. Without it, local social-fit scoring keeps the demo working.

## Live sources

- Meetup public city event pages for Seoul and Tokyo.
- nurio public event listings for Korean community/language-exchange events.
- GO TOKYO public calendar for official Tokyo events.
- Seoul Open Data Plaza `culturalEventInfo`, when `SEOUL_OPEN_DATA_KEY` is set.
- KTO/TourAPI and connpass, when their keys are set.

## Commands

```bash
npm run lint
npm test
npm run build
npm run refresh:events
```

The app stores local event data in `data/social-events.sqlite`, which is ignored by git. It fetches live public listings from Meetup/nurio/GO TOKYO and uses official APIs when keys are configured.
