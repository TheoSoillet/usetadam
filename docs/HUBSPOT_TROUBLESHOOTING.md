# HubSpot OAuth Troubleshooting Guide

## Error: "Couldn't complete the connection - An error occurred while validating the app authorization"

This error means HubSpot is rejecting your OAuth request. Here's what to check:

### Step 1: Check Your Configuration

Visit: `http://localhost:3000/api/integrations/hubspot/debug`

This will show you:
- Your redirect URI
- Your scopes
- The authorization URL being generated

### Step 2: Verify Redirect URI Matches EXACTLY

**Critical:** The redirect URI in your HubSpot app settings must match EXACTLY what your code is sending.

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/apps)
2. Select your app
3. Go to **Auth** tab
4. Check the **Redirect URL** field

**It must be EXACTLY:**
```
http://localhost:3000/api/integrations/hubspot/callback
```

**Common mistakes:**
- ❌ `http://localhost:3000/api/integrations/hubspot/callback/` (trailing slash)
- ❌ `https://localhost:3000/api/integrations/hubspot/callback` (https instead of http)
- ❌ `localhost:3000/api/integrations/hubspot/callback` (missing http://)
- ✅ `http://localhost:3000/api/integrations/hubspot/callback` (correct)

### Step 3: Verify All Scopes Are Enabled

Your HubSpot app must have ALL these scopes enabled:

1. Go to your HubSpot app → **Auth** tab
2. Scroll to **Scopes** section
3. Make sure ALL of these are checked:
   - ✅ `contacts`
   - ✅ `crm.objects.contacts.read`
   - ✅ `crm.objects.contacts.write`
   - ✅ `crm.objects.deals.read`
   - ✅ `crm.objects.deals.write`
   - ✅ `crm.objects.companies.read`
   - ✅ `crm.objects.companies.write`
   - ✅ `crm.schemas.contacts.read`
   - ✅ `crm.schemas.deals.read`
   - ✅ `crm.schemas.companies.read`

**Important:** If ANY scope is missing, HubSpot will reject the authorization.

### Step 4: Verify Client ID

1. Check your `.env.local` file has:
   ```env
   NEXT_PUBLIC_HUBSPOT_CLIENT_ID=your-actual-client-id
   ```

2. Go to HubSpot app → **Auth** tab
3. Copy the **Client ID**
4. Make sure it matches your `.env.local` file EXACTLY (no extra spaces, quotes, etc.)

### Step 5: Check App Status

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/apps)
2. Check your app status:
   - ✅ **Development** - Should work for testing
   - ✅ **Published** - Works for production
   - ❌ **Draft** - Won't work, needs to be in Development

### Step 6: Verify User Permissions

The user installing the app must have:
- **Super Admin** permissions, OR
- **App Marketplace Access** permissions

Check: Settings → Users & Teams → [Your User] → Permissions

### Step 7: Check Browser Console

Open browser DevTools (F12) → Console tab and look for:
- Any JavaScript errors
- Network errors
- The actual redirect URL being used

### Step 8: Test the Authorization URL Directly

1. Visit `/api/integrations/hubspot/debug` to get your authorization URL
2. Copy the `authorizationUrl` from the JSON response
3. Paste it in your browser
4. See what error HubSpot shows

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Update HubSpot app settings to match exactly |
| Missing scopes | Enable all required scopes in HubSpot app |
| Wrong Client ID | Copy Client ID from HubSpot and update `.env.local` |
| App in Draft status | Change app status to Development |
| User lacks permissions | Grant Super Admin or App Marketplace Access |
| Using https://localhost | Use http://localhost for development |

### Still Not Working?

1. **Check server logs** - Look at your terminal where `npm run dev` is running
2. **Check HubSpot app logs** - Go to your app → Logs tab
3. **Try with a different HubSpot account** - Rule out account-specific issues
4. **Verify environment variables** - Restart dev server after changing `.env.local`

### Quick Test

1. Visit: `http://localhost:3000/api/integrations/hubspot/debug`
2. Copy the `authorizationUrl`
3. Open it in a new tab
4. If you see HubSpot login → Good! The URL is correct
5. If you see an error → Check the error message and compare with checklist above
