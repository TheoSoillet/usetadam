import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { connectionId, refreshToken } = await request.json();

    if (!connectionId || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing connectionId or refreshToken' },
        { status: 400 }
      );
    }

    const hubspotClientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
    const hubspotClientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    if (!hubspotClientId || !hubspotClientSecret) {
      return NextResponse.json(
        { error: 'Hubspot credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: hubspotClientId,
        client_secret: hubspotClientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return NextResponse.json(
        { error: `Token refresh failed: ${errorData}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData;

    // Update connection in database
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: connection } = await supabase
      .from('connections')
      .select('metadata')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const updatedMetadata = {
      ...connection.metadata,
      access_token: access_token,
      refresh_token: new_refresh_token || refreshToken,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    };

    const { error: updateError } = await supabase
      .from('connections')
      .update({ metadata: updatedMetadata })
      .eq('id', connectionId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ access_token });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
