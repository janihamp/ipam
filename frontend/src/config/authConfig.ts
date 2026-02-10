import { Configuration, LogLevel } from '@azure/msal-browser'

// MSAL configuration for local development
// For production, these values should come from environment variables
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error(message)
            break
          case LogLevel.Warning:
            console.warn(message)
            break
          case LogLevel.Info:
            console.info(message)
            break
          case LogLevel.Verbose:
            console.debug(message)
            break
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
}

// Scopes for initial sign-in (basic profile)
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}

// Scopes for Azure Management API calls
export const azureManagementScopes = {
  scopes: ['https://management.azure.com/user_impersonation'],
}
