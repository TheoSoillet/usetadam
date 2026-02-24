# Tadam Database Schema

This directory contains the SQL schema for the Tadam Data Sync Planner application.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key

### 2. Run the Schema

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `schema.sql`
3. Execute the SQL script

### 3. Configure Authentication

The schema includes:
- User profiles that extend `auth.users`
- Automatic profile creation on signup via trigger
- Row Level Security (RLS) policies for multi-tenancy

### 4. Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Structure

### Core Tables

- **plans** - Pricing plans (free, pro, enterprise)
- **user_profiles** - Extended user information
- **subscriptions** - User subscriptions to plans
- **connections** - Database connections (Postgres, MySQL, etc.)
- **source_tables** - Tables discovered from connections
- **sync_configs** - Sync job configurations
- **property_mappings** - Field mappings between source and destination
- **sync_executions** - Execution history/logs
- **sync_execution_logs** - Detailed execution logs
- **usage_metrics** - Usage tracking for billing

## Security

All tables have Row Level Security (RLS) enabled:
- Users can only access their own data
- Policies enforce user_id checks
- Service role key needed for admin operations

## Authentication Setup

Supabase Auth handles:
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Magic links
- Password reset

The schema automatically:
- Creates user profile on signup
- Assigns free plan to new users
- Sets up RLS policies

## Next Steps

1. Set up Stripe for payments (update subscription table)
2. Configure email templates in Supabase Auth
3. Set up webhooks for subscription events
4. Create API routes for sync execution
