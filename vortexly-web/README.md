# Vortexly Web (Phase 1)

This folder contains the new production-grade foundation for Vortexly PinEditor.

## What is implemented

- Next.js 16 + TypeScript app scaffold
- Redesigned shell layout (header, left panel, canvas workspace, right panel, footer)
- Supabase auth plumbing (email/password + Google OAuth entry points)
- Session middleware and OAuth callback route
- Initial database schema for projects and exports in `supabase/schema.sql`

## Environment setup

Copy `.env.example` to `.env.local` and set values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Key routes

- `/` landing page
- `/login` auth page
- `/editor` protected workspace shell
- `/auth/callback` OAuth callback handler
- `/logout` sign-out route

## Next implementation slice

1. Migrate existing editor runtime into `/editor` canvas stage.
2. Add project autosave to Supabase table `projects`.
3. Add export upload flow to Supabase Storage + metadata in `exports`.
4. Add optional Google Drive mirroring after primary upload.
