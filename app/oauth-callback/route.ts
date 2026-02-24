import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state');

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=no_code', request.url)
    );
  }

  if (!state) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=invalid_state', request.url)
    );
  }

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=server_config_error', request.url)
      );
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;
    } catch (err) {
      console.error('Invalid state parameter:', err);
      throw new Error('Invalid state parameter');
    }

    // Exchange authorization code for access token
    // Client ID can be public, but Client Secret must be server-side only
    const hubspotClientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
    const hubspotClientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = `${request.nextUrl.origin}/oauth-callback`;

    if (!hubspotClientId || !hubspotClientSecret) {
      console.error('Missing HubSpot credentials:', {
        hasClientId: !!hubspotClientId,
        hasClientSecret: !!hubspotClientSecret,
      });
      throw new Error('Hubspot credentials not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: hubspotClientId,
        client_secret: hubspotClientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info from Hubspot to identify which HubSpot account this is
    const userInfoResponse = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + access_token);
    const userInfo = await userInfoResponse.json();

    // Verify the user ID from state matches authenticated user
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
      console.error('Auth error in callback:', authError);
      return NextResponse.redirect(
        new URL('/auth/login', request.url)
      );
    }

    if (!user || user.id !== userId) {
      console.error('User mismatch:', { userId, authenticatedUserId: user?.id });
      return NextResponse.redirect(
        new URL('/auth/login', request.url)
      );
    }

    // Check if connection already exists for this user and HubSpot account
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'hubspot')
      .eq('status', 'active')
      .single();

    const connectionData = {
      user_id: user.id,
      name: `Hubspot ${userInfo.hub_domain || 'Production'}`,
      type: 'hubspot',
      status: 'active',
      host: 'api.hubapi.com',
      // Store tokens securely in metadata (in production, encrypt these!)
      metadata: {
        access_token: access_token, // TODO: Encrypt this!
        refresh_token: refresh_token, // TODO: Encrypt this!
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        hub_domain: userInfo.hub_domain,
        hub_id: userInfo.hub_id || userInfo.hub_domain,
        scopes: userInfo.scopes || [],
        connected_at: new Date().toISOString(),
      },
    };

    let dbError;
    if (existingConnection) {
      // Update existing connection
      const { error } = await supabase
        .from('connections')
        .update(connectionData)
        .eq('id', existingConnection.id);
      dbError = error;
    } else {
      // Create new connection
      const { error } = await supabase.from('connections').insert(connectionData);
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=database_error', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=hubspot_connected', request.url)
    );
  } catch (err: any) {
    console.error('Hubspot callback error:', err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
        request.url
      )
    );
  }
}
