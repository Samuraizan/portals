# Portals Management Platform

A modern digital signage management platform for Zo House, integrating with PiSignage for player management and Zo API for authentication.

## Features

- **Phone-based OTP Authentication** - Secure login via Zo API
- **Role-Based Access Control** - Granular permissions based on user roles
- **Player Dashboard** - Real-time monitoring of all digital signage displays
- **Content Management** - Upload and manage media content
- **Scheduling** - Schedule content deployment to players
- **Multi-location Support** - Manage players across different locations

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Zo API (Phone OTP)
- **Digital Signage**: PiSignage API

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (for database)
- PiSignage account
- Zo API access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/portals.git
cd portals
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your credentials (see `.env.example` for required variables)

5. Set up database (run `supabase-init.sql` in your Supabase SQL editor)

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

See `.env.example` for all required environment variables:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Secret key for session encryption (min 32 chars) |
| `ZO_API_BASE_URL` | Zo API base URL |
| `ZO_CLIENT_KEY` | Your Zo API client key |
| `PISIGNAGE_API_URL` | Your PiSignage API URL |
| `PISIGNAGE_USERNAME` | PiSignage account email |
| `PISIGNAGE_PASSWORD` | PiSignage account password |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Project Structure

```
portals/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── players/           # Player management components
│   │   ├── content/           # Content management components
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Utility libraries
│   │   ├── auth/              # Session management
│   │   ├── db/                # Database client (Supabase)
│   │   ├── pisignage-api/     # PiSignage API client
│   │   ├── zo-api/            # Zo API client
│   │   └── rbac/              # Role-based access control
│   ├── config/                # Configuration files
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript type definitions
├── supabase-init.sql          # Database schema
└── public/                    # Static assets
```

## User Roles

| Role | Description |
|------|-------------|
| `cas-admin` | Full access to all features and players |
| `sf-admin` | Admin access to SF location players |
| `blr-admin` | Admin access to Bangalore location players |
| `operator` | Can manage content and schedules |
| `default` | View-only access |

## API Endpoints

### Authentication
- `POST /api/auth/login/otp` - Send OTP
- `POST /api/auth/login/verify` - Verify OTP
- `GET /api/auth/session` - Get current session
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Players
- `GET /api/players` - List all players
- `GET /api/players/[id]` - Get player details
- `POST /api/players/[id]/control` - Control player (play/pause/stop)
- `POST /api/players/[id]/playlist` - Set player playlist

### Content
- `GET /api/content` - List content
- `POST /api/content/upload` - Upload content
- `DELETE /api/content/[id]` - Delete content

### Playlists
- `GET /api/playlists` - List playlists

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

Private - All rights reserved.
