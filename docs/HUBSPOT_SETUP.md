# Hubspot Integration Setup Guide

## Overview

For a multi-tenant SaaS application, you need to create a **HubSpot OAuth App** that allows each user to connect their own HubSpot account. This is different from private apps which are account-specific.

## How It Works

1. **User clicks "Connect HubSpot"** → Redirects to HubSpot OAuth authorization
2. **User logs into their HubSpot account** → HubSpot shows consent screen
3. **User authorizes your app** → HubSpot redirects back with authorization code
4. **Your backend exchanges code for tokens** → Stores tokens linked to that user
5. **You can now make API calls** → Using tokens specific to each user's HubSpot account

## Step 1: Create HubSpot OAuth App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Sign in with your HubSpot account (this is YOUR developer account, not users')
3. Click **"Create app"** or go to [App Dashboard](https://developers.hubspot.com/apps)
4. Fill in app details:
   - **App name**: Tadam Data Sync
   - **Description**: Data synchronization platform
   - **Logo**: Upload your logo (optional)

## Step 2: Configure OAuth Settings

1. In your app settings, go to **"Auth"** tab
2. Set **Redirect URL** to:
   ```
   http://localhost:3000/oauth-callback  (development)
   https://yourdomain.com/oauth-callback  (production)
   ```
   
   **Note:** This is the standard HubSpot callback path. Make sure it matches EXACTLY.
3. **Scopes** - Select these scopes (required for syncing):
   - `contacts` - Read and write contacts
   - `crm.objects.contacts.read` - Read contact objects
   - `crm.objects.contacts.write` - Write contact objects
   - `crm.objects.deals.read` - Read deal objects
   - `crm.objects.deals.write` - Write deal objects
   - `crm.objects.companies.read` - Read company objects
   - `crm.objects.companies.write` - Write company objects
   - `crm.schemas.contacts.read` - Read contact schemas
   - `crm.schemas.deals.read` - Read deal schemas
   - `crm.schemas.companies.read` - Read company schemas

## Step 3: Get OAuth Credentials

1. After creating the app, you'll see:
   - **Client ID** (public - safe to expose)
   - **Client Secret** (keep this secret! Server-side only)

2. Copy these values

## Step 4: Add Environment Variables

Add to your `.env.local`:

```env
# Hubspot OAuth (public - safe to expose)
NEXT_PUBLIC_HUBSPOT_CLIENT_ID=your-client-id-here

# Hubspot OAuth (secret - server-side only)
HUBSPOT_CLIENT_SECRET=your-client-secret-here
```

**Note:** Do NOT use `NEXT_PUBLIC_` prefix for the client secret - it should only be `HUBSPOT_CLIENT_SECRET` so it's not exposed to the client.

## Step 5: Test the Integration

1. Go to `/dashboard/integrations`
2. Click **"Connect Hubspot"**
3. You'll be redirected to HubSpot to log in with YOUR HubSpot account
4. After authorization, you'll be redirected back
5. The connection will be stored with access tokens specific to your account

## How It Works (Technical Flow)

### OAuth Flow:
1. User clicks "Connect Hubspot" → `/api/integrations/hubspot/authorize`
2. Server verifies user is authenticated (Supabase session)
3. Server redirects to HubSpot OAuth with:
   - Client ID
   - Scopes
   - Redirect URI
   - State (contains user ID for security)
4. User logs into HubSpot and authorizes
5. HubSpot redirects to `/api/integrations/hubspot/callback?code=...&state=...`
6. Server:
   - Validates state (ensures user ID matches)
   - Exchanges code for access token + refresh token
   - Gets HubSpot account info (hub_domain, hub_id)
   - Stores connection in database linked to user
7. User redirected back to integrations page with success message

### Making API Calls:
Use the helper functions in `lib/hubspot.ts`:

```typescript
import { getHubspotContacts, hubspotApiCall } from '@/lib/hubspot';

// Fetch contacts from the user's connected HubSpot account
const contacts = await getHubspotContacts(100);

// Custom API call
const data = await hubspotApiCall('/crm/v3/objects/contacts', {
  method: 'GET',
});
```

### Token Refresh:
- Access tokens expire after 6 hours
- The system automatically refreshes tokens when needed
- Refresh tokens are stored securely in the database
- Each user's tokens are separate and scoped to their HubSpot account

## Multi-Tenant Architecture

**Key Points:**
- Each user connects their OWN HubSpot account
- Tokens are stored per user in the `connections` table
- When making API calls, we use the token for that specific user
- Users can have multiple HubSpot connections (different accounts)
- Each connection is identified by `hub_domain` or `hub_id`

## Security Notes

⚠️ **Important**: 
- Client Secret must NEVER be exposed to the client (no `NEXT_PUBLIC_` prefix)
- Tokens are stored in the database (consider encryption for production)
- All token exchanges happen server-side via API routes
- State parameter prevents CSRF attacks
- User ID is verified in callback to ensure tokens belong to the right user

## Production Checklist

- [ ] Create Hubspot OAuth app in production
- [ ] Set production redirect URL in HubSpot app settings
- [ ] Add environment variables to production (without `NEXT_PUBLIC_` for secret)
- [ ] Test OAuth flow end-to-end with real HubSpot accounts
- [ ] Consider encrypting stored tokens in database
- [ ] Set up token refresh monitoring
- [ ] Add error handling for expired tokens
- [ ] Test with multiple users connecting different HubSpot accounts

## Troubleshooting

**"Hubspot credentials not configured"**
- Make sure `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` are set in `.env.local`
- Restart your dev server after adding environment variables

**"Invalid state parameter"**
- This means the OAuth flow was interrupted or tampered with
- Try connecting again

**"No authorization code received"**
- User may have cancelled the authorization
- Check HubSpot app redirect URL matches exactly

**Token refresh fails**
- Check that refresh token is still valid
- User may need to reconnect their HubSpot account