import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'user' | 'admin';

// Sign in with email/password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Get current session
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user
export async function getUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// Get user's role
export async function getUserRole(userId?: string): Promise<UserRole | null> {
  const user = userId || (await getUser())?.id;
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user)
    .single();
  
  if (error) {
    return null;
  }
  
  return (data as { role: string } | null)?.role as UserRole || null;
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

// Get all users with roles (admin only)
export async function getAllUsersWithRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      user_id,
      role,
      created_at
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    return [];
  }
  
  return data || [];
}

// Update user role (admin only)
export async function updateUserRole(userId: string, newRole: UserRole) {
  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole } as never)
    .eq('user_id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

