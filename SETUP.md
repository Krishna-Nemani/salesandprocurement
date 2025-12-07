# Setup Guide

Follow these steps to get your Next.js 14 auth app up and running:

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

**Important:**
- Replace `user`, `password`, `localhost`, `5432`, and `mydb` with your PostgreSQL credentials
- Generate a secure `NEXTAUTH_SECRET` using: `openssl rand -base64 32`

## Step 3: Set Up PostgreSQL Database

1. Make sure PostgreSQL is installed and running
2. Create a new database:
   ```sql
   CREATE DATABASE mydb;
   ```
3. Update the `DATABASE_URL` in your `.env` file

## Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply the initial migration
npm run db:migrate
```

This will:
- Create the initial migration file
- Apply it to your database
- Generate the Prisma Client

## Step 5: Seed the Database (Optional)

Create test users with the seed script:

```bash
npm run db:seed
```

This creates two test users:
- **Buyer**: `buyer@example.com` / `password123`
- **Seller**: `seller@example.com` / `password123`

## Step 6: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready` or check your PostgreSQL service
- Double-check your `DATABASE_URL` format
- Ensure the database exists

### Migration Issues

- If migrations fail, you can use `npm run db:push` to push the schema directly (development only)
- Check Prisma logs for specific error messages

### NextAuth Issues

- Ensure `NEXTAUTH_SECRET` is set in your `.env` file
- Verify `NEXTAUTH_URL` matches your app URL

## Next Steps

- Customize the dashboard layout
- Add more features based on user roles
- Implement additional authentication providers if needed
- Add more database models as required

