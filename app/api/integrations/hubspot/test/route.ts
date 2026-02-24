import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify HubSpot configuration
 * Visit: /api/integrations/hubspot/test
 */
export async function GET(request: NextRequest) {
  const checks = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasHubspotClientId: !!(
      process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID
    ),
    hasHubspotClientSecret: !!process.env.HUBSPOT_CLIENT_SECRET,
    hubspotClientId: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID || 'NOT SET',
  };

  const allGood = Object.values(checks).every(
    (v) => v === true || (typeof v === 'string' && v !== 'NOT SET')
  );

  return NextResponse.json({
    status: allGood ? 'ok' : 'error',
    checks,
    message: allGood
      ? 'All environment variables are configured'
      : 'Some environment variables are missing',
  });
}
