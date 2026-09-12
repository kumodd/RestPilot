# RestPilot Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the RestPilot Next.js application to Vercel using the Vercel Command Line Interface (CLI).

## Prerequisites

1. Node.js installed on your machine.
2. A [Vercel account](https://vercel.com/signup).
3. Your Supabase project URL and keys.

## 1. Install the Vercel CLI

Open your terminal and install the Vercel CLI globally using npm:

```bash
npm i -g vercel
```

## 2. Authenticate with Vercel

Log in to your Vercel account from the CLI. Run the following command and follow the prompts in your browser:

```bash
vercel login
```

## 3. Link Your Project

Navigate to the root of your RestPilot directory (where your `package.json` is located):

```bash
cd /path/to/RestPilot
```

Run the `vercel` command to initialize the project:

```bash
vercel
```

You will be prompted with a series of setup questions:
- **Set up and deploy "~/path/to/RestPilot"?** `[Y/n]` -> Type **Y**
- **Which scope do you want to deploy to?** -> Select your Vercel account
- **Link to existing project?** `[y/N]` -> Type **N**
- **What's your project's name?** -> Press enter to accept `restpilot`, or type a new name
- **In which directory is your code located?** -> Press enter for `./`
- **Want to modify these settings?** `[y/N]` -> Type **N** (Vercel automatically detects Next.js)

## 4. Configure Environment Variables

For RestPilot to connect to your database and handle authentication, you must add your Supabase credentials to Vercel. 

You can add these securely using the CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste your Supabase Project URL when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your Supabase Anon Key when prompted
```

> **Note:** If you have other environment variables (e.g., Service Role Keys for admin actions), make sure to add them as well using the same `vercel env add` command.

## 5. Deploy to Production

Once your environment variables are configured, run the following command to build and deploy your application to production:

```bash
vercel --prod
```

Vercel will upload your code, run the Next.js build process (`npm run build`), and deploy the app. Once finished, the CLI will output a **Production URL** where your app is live!

## 6. Continuous Integration (Optional but Recommended)

If you have connected your RestPilot code to a GitHub repository, Vercel will automatically deploy any new commits pushed to your `main` branch. 

To link your GitHub repository to this Vercel project, go to your [Vercel Dashboard](https://vercel.com/dashboard), select your project, go to **Settings > Git**, and connect your repository.
