import { Amplify } from 'aws-amplify';

// Load configuration from environment or runtime
const getConfig = () => {
  // Try to load from runtime env.json (injected at build time)
  if (typeof window !== 'undefined') {
    try {
      const envConfig = (window as any).__ENV__;
      if (envConfig) {
        return {
          userPoolId: envConfig.cognitoUserPoolId,
          userPoolClientId: envConfig.cognitoUserPoolWebClientId,
          domain: envConfig.cognitoDomain,
        };
      }
    } catch (e) {
      console.warn('Runtime config not found, using env variables');
    }
  }

  // Fallback to Next.js environment variables
  return {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  };
};

export const configureAmplify = () => {
  const config = getConfig();

  if (!config.userPoolId || !config.userPoolClientId || !config.domain) {
    console.error('Missing Cognito configuration');
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: {
          oauth: {
            domain: config.domain,
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [
              typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
              `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/chat`,
            ],
            redirectSignOut: [
              typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            ],
            responseType: 'code',
          },
        },
      },
    },
  });
};
