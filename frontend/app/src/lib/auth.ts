import { fetchAuthSession, fetchUserAttributes, signInWithRedirect } from 'aws-amplify/auth';

export interface User {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await fetchAuthSession();

    if (!session.tokens) {
      return null;
    }

    const attributes = await fetchUserAttributes();

    return {
      userId: attributes.sub || '',
      email: attributes.email || '',
      name: attributes.name,
      picture: attributes.picture,
      emailVerified: attributes.email_verified === 'true',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get authentication token for API requests
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    await signInWithRedirect({ provider: 'Google' });
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens;
  } catch (error) {
    return false;
  }
}
