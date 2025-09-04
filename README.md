This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies:

```bash
npm install
```

### Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.local.example .env.local
```

Fill in your environment variables:
- **Supabase**: Get URL and keys from your Supabase project settings
- **RingCentral**: Configure OAuth app and get client credentials
- **Service Role Key**: Required for server-side operations

### Database Setup

1. Run the schema SQL in your Supabase SQL editor:
   ```sql
   -- Copy contents of db/schema.sql
   ```

2. Seed with sample data (optional):
   ```sql
   -- Copy contents of db/seed.sql
   ```

### Authentication

The app uses Supabase Auth with email magic links. Users are automatically mirrored to the `public.users` table and can create/join organizations.

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Setup

This project uses Supabase as the database. Follow these steps to set up your database:

### 1. Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual Supabase project values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `db/schema.sql`
4. Click "Run" to create all tables and initial data

### 3. Seed Sample Data (Optional)

To populate your database with sample data for development:

1. In the Supabase SQL Editor
2. Copy and paste the contents of `db/seed.sql`
3. Click "Run" to insert sample users, companies, contacts, and deals

The seed data includes:
- Sample user (john.doe@example.com)
- 3 companies (TechCorp Solutions, Global Industries, Innovate Labs)
- 4 contacts across different companies
- 7 deals distributed across all pipeline stages
- Sample activities for some deals

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
