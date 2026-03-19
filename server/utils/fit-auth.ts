interface FitTokenResponse {
  access_token: string
}

interface FitCheckTokenResponse {
  user_name?: string
}

interface ExchangeCodeForTokenParams {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
  code: string
  tokenUrl: string
}

interface VerifyAccessTokenParams {
  accessToken: string
  checkTokenUrl: string
}

export function getAllowedUsers(rawAllowedUsers: string): string[] {
  return rawAllowedUsers
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export async function exchangeCodeForToken(params: ExchangeCodeForTokenParams): Promise<FitTokenResponse> {
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    scope: params.scope,
    code: params.code
  })

  return $fetch<FitTokenResponse>(params.tokenUrl, {
    method: 'POST',
    body: tokenParams.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`
    }
  })
}

export async function verifyAccessToken(params: VerifyAccessTokenParams): Promise<string | null> {
  const checkTokenParams = new URLSearchParams({
    token: params.accessToken
  })

  const response = await $fetch<FitCheckTokenResponse>(params.checkTokenUrl, {
    method: 'POST',
    body: checkTokenParams.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (typeof response.user_name !== 'string') {
    return null
  }

  return response.user_name
}
