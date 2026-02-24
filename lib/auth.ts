import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export async function signUp({ email, password, fullName }: SignUpData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/verify-email`
        : undefined,
    },
  });

  if (error) {
    // Provide more user-friendly error messages
    if (error.message.includes('already registered')) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (error.message.includes('password')) {
      throw new Error('Password does not meet requirements. Please use at least 8 characters.');
    }
    if (error.message.includes('email')) {
      throw new Error('Invalid email address. Please check and try again.');
    }
    throw error;
  }

  // If user is created but profile creation fails, try to create it manually
  if (data.user) {
    try {
      // Try to create profile if trigger didn't work
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName || '',
        })
        .select()
        .single();

      // If profile already exists or was created by trigger, that's fine
      if (profileError && !profileError.message.includes('duplicate')) {
        console.warn('Profile creation warning:', profileError);
      }
    } catch (profileErr) {
      // Profile creation is optional - auth user is already created
      console.warn('Could not create profile:', profileErr);
    }
  }

  return data;
}

export async function signIn({ email, password }: SignInData) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  // Ensure session is available
  if (!data.session) {
    throw new Error("Login successful but no session was created");
  }
  
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveSubscription(userId: string) {
  const { data, error } = await supabase
    .from('active_subscriptions_view')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}
