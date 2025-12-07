# Next.js 14 Auth App

A Next.js 14 application with TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, and NextAuth authentication.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ Prisma ORM with PostgreSQL
- ✅ NextAuth with Credentials provider
- ✅ Role-based authentication (BUYER, SELLER)
- ✅ Dashboard layout with sidebar and top bar

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and update:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - A random secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for development)

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

Make sure PostgreSQL is running and create a database. Update the `DATABASE_URL` in your `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

Then run:
```bash
npm run db:migrate
```

## Creating a User

You can create a user by running a script or using Prisma Studio:

```bash
npm run db:studio
```

Or create a seed script to add initial users.

## Project Structure

```
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth API route
│   ├── auth/signin/              # Sign in page
│   ├── dashboard/                # Dashboard pages
│   └── layout.tsx                # Root layout
├── components/
│   ├── dashboard/                # Dashboard components
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client
│   └── utils.ts                  # Utility functions
├── prisma/
│   └── schema.prisma             # Prisma schema
└── types/
    └── next-auth.d.ts            # NextAuth type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Authentication

The app uses NextAuth with Credentials provider. Users can sign in with email and password. The app supports two roles:
- **BUYER** - Default role for new users
- **SELLER** - Can be assigned to users

## License

MIT

