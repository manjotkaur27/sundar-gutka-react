// Auth token provider for dashboard sync (POST /dashboard/cache, GET /dashboard/latest).
//
// Both endpoints require a Bearer JWT. The app has no SSO yet, so this returns null
// and the sync layer stays dormant (every sync call early-returns on a null token).
// When SSO/Google/Apple sign-in is added, return the access token here — that single
// change activates push + restore everywhere.
export const getAuthToken = async () => {
  // TODO: return the SSO/JWT access token once authentication is implemented.
  return null;
};

export default getAuthToken;
