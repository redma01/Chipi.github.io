# Deployment Guide (GitHub Pages)

## Goal: Publish without exposing API keys

This project now uses a **Firebase Cloud Functions proxy** so the OpenRouter API key stays on the backend. No OpenRouter keys are embedded in the client code.

### What this means

- The site can be hosted with Firebase Hosting (recommended) so Functions and Hosting share the same project.
- Users are **not** prompted for API keys in the browser.
- The OpenRouter API key is stored only in Firebase Functions environment config.

## Steps for Firebase Hosting + Functions

1. Install Firebase CLI if needed:
   - `npm i -g firebase-tools`
2. Login and initialize (in repo root):
   - `firebase login`
   - `firebase init functions hosting`
3. Set the OpenRouter API key as a Functions secret:
   - `firebase functions:secrets:set OPENROUTER_API_KEY`
4. Deploy Functions and Hosting:
   - `firebase deploy`
5. Visit the Hosting URL. AI features will use the backend proxy automatically.

## Important security notes

- **Never** embed API keys in `.js` or `.html`.
- Keep the OpenRouter key in Firebase Functions config only.

## Files updated for server-side proxy

- `mainpage.js`
- `assessment.js`
- `lesson-planning.js`
- `lesson-planning-deped.js`
- `slides.js`
- `aidetector.js`

