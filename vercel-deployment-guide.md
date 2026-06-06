# Vercel Deployment Guide for FlashCard App

This guide explains how to deploy your static `flashcard-app.html` project to Vercel.

## 1. Prepare your project

1. Ensure your project folder contains:
   - `flashcard-app.html`
   - `manifest.json`
   - `service-worker.js`
   - `vercel.json`

2. If your app is not in a GitHub repo yet, create one and push the project files.

## 2. Create a GitHub repository

1. Open GitHub and create a new repository.
2. Add a repository name like `flashcard-app`.
3. Push your local project to the new repository.

## 3. Sign in to Vercel

1. Open https://vercel.com
2. Sign in with GitHub (or create a Vercel account).

## 4. Import your repository

1. Click **New Project**.
2. Choose your GitHub repository from the list.
3. Click **Import**.

## 5. Configure deploy settings

1. Under **Framework Preset**, select **Other**.
2. Leave **Build Command** empty.
3. Set **Output Directory** to `.` (root).
4. Click **Deploy**.

## 6. Verify deployment

1. After deployment succeeds, Vercel provides a public URL.
2. Open the URL and confirm the app loads.
3. Check the browser console for any errors.

## 7. Confirm PWA support

1. Verify `manifest.json` loads by opening:
   - `https://<your-site-url>/manifest.json`
2. Confirm the service worker registers in the browser console.
3. On mobile, open the URL in Safari or Chrome and look for install/prompt options.

## 8. Update application if needed

1. When you change `flashcard-app.html`, commit and push to GitHub.
2. Vercel will automatically redeploy the updated app.

## 9. Optional: use a custom domain

1. In Vercel, go to your project dashboard.
2. Click **Settings** → **Domains**.
3. Add your custom domain and follow the DNS instructions.

## Notes

- Vercel deploys static sites automatically from GitHub.
- No backend is required for the current static app.
- If you later add Stripe/Supabase payment endpoints, a separate backend or serverless API route will be required.
