# Database Setup Instructions

## Important: Database Configuration Required

The migration file has been created, but you need to configure your PostgreSQL database before you can run migrations and use the application.

## Steps to Complete Database Setup

### 1. Install PostgreSQL (if not already installed)

Download and install PostgreSQL from: https://www.postgresql.org/download/

### 2. Create a Database

Open PostgreSQL (psql or pgAdmin) and create a new database:

```sql
CREATE DATABASE mydb;
```

Or use a different database name if you prefer.

### 3. Update .env File

Edit the `.env` file in the root directory and update the `DATABASE_URL` with your actual PostgreSQL credentials:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE_NAME?schema=public"
```

Replace:
- `YOUR_USERNAME` - Your PostgreSQL username (default is often `postgres`)
- `YOUR_PASSWORD` - Your PostgreSQL password
- `YOUR_DATABASE_NAME` - The database name you created (e.g., `mydb`)
- `5432` - Your PostgreSQL port (default is 5432)

### 4. Run the Migration

Once your database is configured, run:

```bash
npm run db:migrate
```

This will apply the migration and create the User table with the Role enum.

### 5. Seed the Database (Optional)

Create test users:

```bash
npm run db:seed
```

This creates:
- **Buyer**: `buyer@example.com` / `password123`
- **Seller**: `seller@example.com` / `password123`

## Alternative: Use Prisma Migrate Deploy

If you've already created the migration file manually, you can use:

```bash
npx prisma migrate deploy
```

This applies pending migrations without creating new ones.

## Verify Database Connection

Test your connection:

```bash
npx prisma db pull
```

If this succeeds, your database is properly configured!

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL service is running
- Check if the port (5432) is correct
- Verify firewall settings

### Authentication Failed
- Double-check username and password
- Ensure the user has permissions to create databases/tables
- Try using the `postgres` superuser for initial setup

### Database Does Not Exist
- Create the database first using `CREATE DATABASE your_db_name;`
- Or update the connection string to use an existing database

