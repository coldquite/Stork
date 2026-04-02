import { describe, expect, it } from 'vitest'
import { shouldRedirectToHttps } from '#server/utils/https-redirect'

describe('https redirect utils', () => {
  it('redirects production http requests from non-local hosts', () => {
    expect(
      shouldRedirectToHttps({
        nodeEnv: 'production',
        requestProtocol: 'http:',
        requestHostname: 'cap.ksi.fit.cvut.cz',
        forwardedProtoHeader: 'http'
      })
    ).toBe(true)
  })

  it('does not redirect when proxy already reports https', () => {
    expect(
      shouldRedirectToHttps({
        nodeEnv: 'production',
        requestProtocol: 'http:',
        requestHostname: 'cap.ksi.fit.cvut.cz',
        forwardedProtoHeader: 'https'
      })
    ).toBe(false)
  })

  it('does not redirect localhost/loopback requests', () => {
    expect(
      shouldRedirectToHttps({
        nodeEnv: 'production',
        requestProtocol: 'http:',
        requestHostname: '127.0.0.1',
        forwardedProtoHeader: undefined
      })
    ).toBe(false)

    expect(
      shouldRedirectToHttps({
        nodeEnv: 'production',
        requestProtocol: 'http:',
        requestHostname: 'localhost',
        forwardedProtoHeader: undefined
      })
    ).toBe(false)
  })

  it('does not redirect outside production', () => {
    expect(
      shouldRedirectToHttps({
        nodeEnv: 'development',
        requestProtocol: 'http:',
        requestHostname: 'cap.ksi.fit.cvut.cz',
        forwardedProtoHeader: 'http'
      })
    ).toBe(false)
  })
})
