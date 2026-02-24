import { supabase } from './supabase';
import { getCurrentUser } from './auth';

interface HubspotToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Get Hubspot access token for the current user
 * Automatically refreshes if expired
 */
export async function getHubspotToken(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: connection, error } = await supabase
    .from('connections')
    .select('metadata')
    .eq('user_id', user.id)
    .eq('type', 'hubspot')
    .eq('status', 'active')
    .single();

  if (error || !connection) {
    throw new Error('Hubspot connection not found');
  }

  const tokens = connection.metadata as HubspotToken & { is_private_app?: boolean };
  
  // Private app tokens don't expire
  if (tokens.is_private_app) {
    return tokens.access_token;
  }
  
  // Check if OAuth token is expired (with 5 minute buffer)
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < buffer) {
      // Token expired or expiring soon, refresh it
      if (tokens.refresh_token) {
        return await refreshHubspotToken(connection.id, tokens.refresh_token);
      }
    }
  }

  return tokens.access_token;
}

/**
 * Refresh Hubspot access token
 */
async function refreshHubspotToken(connectionId: string, refreshToken: string): Promise<string> {
  const hubspotClientId = process.env.HUBSPOT_CLIENT_ID;
  const hubspotClientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!hubspotClientId || !hubspotClientSecret) {
    throw new Error('Hubspot credentials not configured');
  }

  // Call server-side API to refresh token (for security)
  const response = await fetch('/api/integrations/hubspot/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connectionId,
      refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Hubspot token');
  }

  const { access_token } = await response.json();
  return access_token;
}

/**
 * Make an authenticated API call to Hubspot
 */
export async function hubspotApiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getHubspotToken();

  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API call failed' }));
    throw new Error(error.message || `Hubspot API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Example: Fetch contacts from Hubspot
 */
export async function getHubspotContacts(limit = 100) {
  return hubspotApiCall(`/crm/v3/objects/contacts?limit=${limit}`);
}

/**
 * Example: Fetch deals from Hubspot
 */
export async function getHubspotDeals(limit = 100) {
  return hubspotApiCall(`/crm/v3/objects/deals?limit=${limit}`);
}

/**
 * Example: Fetch companies from Hubspot
 */
export async function getHubspotCompanies(limit = 100) {
  return hubspotApiCall(`/crm/v3/objects/companies?limit=${limit}`);
}
