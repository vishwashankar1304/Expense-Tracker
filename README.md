# Expense Tracker

Full-stack expense tracker built with React, TypeScript, Tailwind, and Supabase.

## live link

https://savvy-saver.netlify.app/

## Features

- Supabase authentication (signup, signin, signout)
- Dashboard with smart summaries, quick actions, and filters
- Interactive charts and financial insights
- Reports with budget tracking and CSV export
- Responsive UI with yellow/white theme

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Database)
- TanStack Query
- Recharts

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests once

## Supabase

This project uses Supabase for authentication and transaction storage.
Supabase client configuration is in `src/lib/supabase.ts`.

## Project Structure

- `src/pages` - Route pages (Dashboard, Charts, Reports, Profile, Auth)
- `src/components` - Reusable UI and feature components
- `src/hooks` - Custom hooks (transactions, toast, etc.)
- `src/contexts` - Global app context (auth)
- `src/lib` - Supabase client and data utilities

## License

For personal and educational use.
