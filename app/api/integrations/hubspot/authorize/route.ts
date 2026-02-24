import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Initiate HubSpot OAuth flow
 * This redirects the user to HubSpot to authorize our app
 */
export async function GET(request: NextRequest) {
  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/integrations', request.url)
      );
    }

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/integrations', request.url)
      );
    }

    // Get HubSpot OAuth credentials
    // Client ID can be public (NEXT_PUBLIC_ prefix is fine)
    const hubspotClientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = `${request.nextUrl.origin}/oauth-callback`;

    if (!hubspotClientId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=hubspot_not_configured', request.url)
      );
    }

    // Required scopes for syncing contacts, deals, companies
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

    // Generate state parameter for security (store user ID)
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64');

    // Redirect to HubSpot OAuth authorization page
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.set('client_id', hubspotClientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (err: any) {
    console.error('HubSpot authorize error:', err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
        request.url
      )
    );
  }
}
