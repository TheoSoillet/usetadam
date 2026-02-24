import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check HubSpot OAuth configuration
 * Visit: /api/integrations/hubspot/debug
 */
export async function GET(request: NextRequest) {
  const hubspotClientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = `${request.nextUrl.origin}/oauth-callback`;
  
  const scopes = [
    'contacts',
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.schemas.contacts.read',
    'crm.schemas.deals.read',
    'crm.schemas.companies.read',
  ].join(' ');

  // Build the authorization URL that would be used
  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', hubspotClientId || 'NOT_SET');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.json({
    configuration: {
      hasClientId: !!hubspotClientId,
      clientId: hubspotClientId ? `${hubspotClientId.substring(0, 8)}...` : 'NOT SET',
      hasClientSecret: !!process.env.HUBSPOT_CLIENT_SECRET,
      redirectUri,
      scopes: scopes.split(' '),
      scopeCount: scopes.split(' ').length,
    },
    authorizationUrl: authUrl.toString(),
    stepByStepChecklist: {
      step1: {
        title: 'Verify Redirect URI in HubSpot App Settings',
        action: 'Go to https://developers.hubspot.com/apps → Your App → Auth tab',
        check: `Redirect URL field must be EXACTLY: ${redirectUri}`,
        commonMistakes: [
          'Trailing slash: /callback/ ❌',
          'Using https:// instead of http:// for localhost ❌',
          'Missing http:// prefix ❌',
          'Extra spaces or characters ❌',
        ],
      },
      step2: {
        title: 'Enable ALL Required Scopes',
        action: 'In your HubSpot app → Auth tab → Scopes section',
        requiredScopes: scopes.split(' '),
        note: 'ALL scopes listed above must be checked/enabled. If ANY scope is missing, HubSpot will reject the authorization.',
      },
      step3: {
        title: 'Check App Status',
        action: 'Go to https://developers.hubspot.com/apps → Your App',
        check: 'App status must be "Development" or "Published" (NOT "Draft")',
      },
      step4: {
        title: 'Verify Client ID Matches',
        action: 'Compare Client ID in HubSpot app settings with your .env.local',
        check: `Should start with: ${hubspotClientId?.substring(0, 8)}...`,
      },
      step5: {
        title: 'Check User Permissions',
        action: 'The HubSpot account you\'re using to test must have Super Admin or App Marketplace Access permissions',
        check: 'Go to HubSpot Settings → Users & Teams → Your User → Permissions',
      },
    },
    testAuthorizationUrl: {
      url: authUrl.toString(),
      instruction: 'Copy this URL and paste it in your browser. If you see HubSpot login, your URL is correct. If you see an error, check the error message.',
    },
  });
}
