# Web Deployment

The Railway service at `https://web-production-efb69.up.railway.app` is the FastAPI backend.
Deploy the Expo web frontend as a separate static site.

## Netlify

1. Create a new Netlify site from this GitHub repository.
2. Netlify will use `netlify.toml`:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
   - Backend API: `https://web-production-efb69.up.railway.app`
3. Add these environment variables in Netlify site settings:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
4. In Firebase Console, add the Netlify domain to Authentication > Settings > Authorized domains.

## Vercel

1. Create a new Vercel project from this GitHub repository.
2. Vercel will use `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm run build:web`
   - Output directory: `dist`
   - Backend API: `https://web-production-efb69.up.railway.app`
3. Add the same `EXPO_PUBLIC_FIREBASE_*` environment variables in Vercel project settings.
4. In Firebase Console, add the Vercel domain to Authentication > Settings > Authorized domains.

## Local production check

```sh
EXPO_PUBLIC_API_BASE_URL=https://web-production-efb69.up.railway.app npm run build:web
npx serve dist -l 8081
```
