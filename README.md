# PRC D'or

The PRC society's annual football community awards. Players register with a profile, vote for their top 10 players of the year, and help crown the PRC D'or winner.

## Features

- User accounts with email/password sign up and sign in
- Player profiles with name, nickname, age, position, jersey number, and profile photo
- Top-10 ranked voting with drag-and-drop reordering and a points system
- Voting periods with live countdown timers and one-vote-per-period enforcement
- Live results leaderboard with podium, confetti, and share support
- Hall of Fame page honoring every past winner
- Player directory with search and position filtering
- Analytics dashboard with voting charts and participation stats
- Admin control room to manage voting periods, declare winners, reset votes, and manage players

## Tech Stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TanStack Start](https://tanstack.com/start) (Router, React Query, file-based routing)
- [Vite](https://vitejs.dev) + [Nitro](https://nitro.unjs.io)
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) components (Radix UI primitives, [lucide-react](https://lucide.dev) icons)
- [Supabase](https://supabase.com) — Auth, Postgres database, and Storage
- [dnd-kit](https://dndkit.com) — drag-and-drop voting
- [recharts](https://recharts.org) — analytics charts

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) and npm
- A [Supabase](https://supabase.com) project with the database schema applied (see `src/supabase/migrations`)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Suryanshu77/prc-dor.git
   cd prc-dor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and fill in your Supabase values (see below).

### Environment Variables

The project needs a Supabase project URL and the corresponding API keys. The following variables are required:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key for the client |
| `SUPABASE_URL` | Your Supabase project URL (server-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side admin operations only) |

Example:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never commit your real keys. The `.env` file is already gitignored.

### Running the Project

Start the development server:

```bash
npm run dev
```

The app runs at [http://localhost:8080](http://localhost:8080).

### Building for Production

Create a production build:

```bash
npm run build
```

## Project Structure

```text
src/
├── routes/                  # File-based pages (TanStack Router)
│   └── _authenticated/      # Pages behind the login (dashboard, vote, results, etc.)
├── components/              # UI components (shadcn/ui) and app components
│   └── ui/                  # Reusable shadcn/ui primitives
├── integrations/supabase/   # Supabase client, server client, and auth middleware
├── lib/                     # Auth context, vote points, utilities
├── supabase/migrations/     # SQL migrations for the database schema
├── assets/                  # Static images
├── router.tsx               # App router setup
├── start.ts                 # TanStack Start middleware setup
└── styles.css               # Global styles (Tailwind)
```

## Deployment

The production build targets Cloudflare Workers via Nitro's `cloudflare-module` preset and is deployed with [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## Contributing

Contributions are welcome. Fork the repository, make your changes, and open a pull request. For significant changes, open an issue first to discuss what you'd like to do.

## Author

[Suryanshu Saxena](https://github.com/Suryanshu77)
