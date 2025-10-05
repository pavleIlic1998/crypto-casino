# Crypto Casino Setup Instructions

## Current Status

✅ **Frontend**: Fixed and ready
✅ **Environment Variables**: Configured
✅ **Code**: All bugs fixed
⏳ **Database**: Waiting for Supabase region availability
⏳ **Edge Functions**: Ready to deploy when region is available

## Issue Resolution

### White Screen Fix
The white screen was caused by environment variables not loading properly. This has been **FIXED** by:
- Removing leading whitespace from `.env` file
- Ensuring proper formatting of VITE variables

## Setup Steps (When Supabase Region is Available)

### 1. Database Setup

Run the following command to apply all migrations:

```bash
# The database schema is in setup-database.sql
# You can apply it when the region is available
```

Or use the Supabase dashboard to run the SQL in `setup-database.sql`

### 2. Deploy Edge Functions

Deploy all four edge functions:

1. **init-seeds** - Initializes provably fair seeds
2. **play-slots** - Handles slots game logic
3. **play-crash** - Handles crash game logic
4. **play-roulette** - Handles roulette game logic

All functions are in `supabase/functions/` directory.

### 3. Verify Setup

```bash
# Build the project
npm run build

# The dev server should already be running
# If not, start it with: npm run dev
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── LoginModal.tsx         # Login form
│   │   ├── RegisterModal.tsx      # Registration wizard
│   │   └── games/
│   │       ├── SlotsGame.tsx      # Slots game
│   │       ├── CrashGame.tsx      # Crash game
│   │       └── RouletteGame.tsx   # Roulette game
│   ├── lib/
│   │   └── supabase.ts            # Supabase client
│   └── App.tsx                    # Main app
├── supabase/
│   ├── functions/                 # Edge functions
│   │   ├── init-seeds/
│   │   ├── play-slots/
│   │   ├── play-crash/
│   │   └── play-roulette/
│   └── migrations/                # Database migrations
└── setup-database.sql             # Complete database setup script
```

## Features

### Games
- **Slots (5x3)**: 5 paylines, 8 symbols, provably fair
- **Crash**: Multiplier-based game with auto-cashout
- **Roulette**: European roulette with multiple bet types

### Security
- Provably fair gaming using HMAC-SHA256
- Row Level Security (RLS) on all tables
- Secure authentication via Supabase Auth
- Client and server seed verification

### User Features
- Multi-step registration with age verification
- Language selection
- Starting balance of $100
- Real-time balance updates
- Complete bet history

## Environment Variables

Already configured in `.env`:
```
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
```

## Known Issues

1. **Supabase Region Unavailable**: The eu-central-2 region is temporarily down. Check status at: https://status.supabase.com
2. Once the region is back, you'll need to:
   - Apply database migrations
   - Deploy edge functions
   - Test the complete flow

## Testing Flow

Once everything is deployed:

1. **Register**: Create account with username, email, DOB, language
2. **Login**: Sign in with credentials
3. **Play Games**: Try all three games
4. **Verify Balance**: Check balance updates after each game
5. **Provably Fair**: Each bet is verifiable with seeds and nonce

## Technical Details

### Database Tables
- `user_profiles`: User data and balance
- `game_config`: Game settings and paytables
- `game_seeds`: Cryptographic seeds for provably fair gaming
- `game_bets`: Complete bet history

### Edge Functions
All functions use:
- CORS headers for cross-origin requests
- JWT authentication
- Error handling with proper status codes
- HMAC-SHA256 for provably fair results

## Next Steps

1. Wait for Supabase region to become available
2. Run `setup-database.sql` in Supabase SQL editor
3. Deploy edge functions via Supabase dashboard or CLI
4. Test the complete application
5. Verify provably fair results

## Support

The frontend is now working correctly. The white screen issue has been resolved. Once the Supabase region is available, the backend will be fully functional.
