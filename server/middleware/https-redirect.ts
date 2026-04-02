import { defineEventHandler, getHeader, getRequestURL, sendRedirect } from 'h3'
import { shouldRedirectToHttps } from '#server/utils/https-redirect'

// Keep HTTPS upgrade temporary to avoid long-lived permanent redirect caching in browsers/search engines (as I just afraid to make a mistake during developing)
const TEMPORARY_REDIRECT_STATUS = 307

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)

  // Respect reverse-proxy forwarding headers and skip local health checks
  if (
    !shouldRedirectToHttps({
      nodeEnv: process.env.NODE_ENV,
      requestProtocol: requestUrl.protocol,
      requestHostname: requestUrl.hostname,
      forwardedProtoHeader: getHeader(event, 'x-forwarded-proto')
    })
  ) {
    return
  }

  requestUrl.protocol = 'https:'
  return sendRedirect(event, requestUrl.toString(), TEMPORARY_REDIRECT_STATUS)
})
