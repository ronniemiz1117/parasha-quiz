# חידון פרשת השבוע - Parasha Quiz App

A competitive quiz platform for Jewish youth to test their knowledge of weekly Torah portions (Parshiyot).

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel (recommended)

## Getting Started

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `schema.sql`
3. Get your project URL and anon key from Settings → API

### 2. Configure Environment

Copy `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup pages
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/           # Authenticated pages
│   │   ├── dashboard/
│   │   ├── quizzes/
│   │   ├── quiz/[id]/
│   │   ├── groups/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── layout.tsx
│   └── page.tsx          # Landing page
├── components/
│   ├── quiz/
│   │   └── quiz-player.tsx
│   └── ui/
│       └── navbar.tsx
├── lib/
│   └── supabase/
│       ├── client.ts     # Browser client
│       ├── server.ts     # Server client
│       └── middleware.ts # Auth middleware
└── types/
    └── database.ts       # TypeScript types
```

## Features

### For Students
- Weekly Hebrew Torah quizzes
- Multiple attempts with time tracking
- Progress tracking and stats
- Group leaderboards
- Join groups via invite codes

### For Teachers/Admins
- Create groups with invite codes
- Manage quizzes per parasha
- View student progress

## Database Schema

See `schema.sql` for the full schema. Key tables:

| Table | Purpose |
|-------|---------|
| `parshiyot` | 54 weekly Torah portions |
| `aliyot` | 7 readings per parasha |
| `quizzes` | Quiz definitions |
| `questions` | Quiz questions linked to aliyot |
| `answer_choices` | Multiple choice answers |
| `quiz_attempts` | User quiz sessions |
| `profiles` | User profiles (extends Supabase auth) |
| `groups` | Synagogues, schools, classes |
| `group_memberships` | User-group relationships |
| `group_invitations` | Invite codes for groups |

## Row Level Security (RLS)

After running the schema, set up RLS policies in Supabase:

```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to read published quizzes
CREATE POLICY "Anyone can read published quizzes" ON quizzes
  FOR SELECT USING (is_published = true);

-- Allow users to create their own quiz attempts
CREATE POLICY "Users can create own attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- See rls_policies.sql for complete policies
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Development Notes

- All UI is in Hebrew (RTL)
- Uses Rubik font for Hebrew support
- Supabase handles authentication
- Quiz timing enforced client-side with server validation

## License

MIT
