import { describe, it, expect } from 'vitest'
import {
  CubeConnectError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from '../src/errors/index.js'

describe('CubeConnectError', () => {
  it('extends Error', () => {
    const err = new CubeConnectError('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CubeConnectError)
    expect(err.name).toBe('CubeConnectError')
  })

  it('sets statusCode and errorCode', () => {
    const err = new CubeConnectError('msg', 500, 'INTERNAL_ERROR')
    expect(err.message).toBe('msg')
    expect(err.statusCode).toBe(500)
    expect(err.errorCode).toBe('INTERNAL_ERROR')
  })

  it('serverError() creates a server error', () => {
    const err = CubeConnectError.serverError(502, 'BAD_GATEWAY', 'Bad gateway')
    expect(err.statusCode).toBe(502)
    expect(err.errorCode).toBe('BAD_GATEWAY')
    expect(err.message).toBe('Bad gateway')
  })

  it('serverError() uses defaults when no message', () => {
    const err = CubeConnectError.serverError(500)
    expect(err.statusCode).toBe(500)
    expect(err.errorCode).toBe('SERVER_ERROR')
    expect(err.message).toContain('500')
  })

  it('connectionFailed() preserves cause', () => {
    const cause = new TypeError('fetch failed')
    const err = CubeConnectError.connectionFailed(cause)
    expect(err.errorCode).toBe('CONNECTION_FAILED')
    expect(err.statusCode).toBe(0)
    expect(err.cause).toBe(cause)
  })
})

describe('AuthenticationError', () => {
  it('extends CubeConnectError', () => {
    const err = AuthenticationError.invalidKey()
    expect(err).toBeInstanceOf(CubeConnectError)
    expect(err).toBeInstanceOf(AuthenticationError)
    expect(err.name).toBe('AuthenticationError')
  })

  it('invalidKey() sets 401', () => {
    const err = AuthenticationError.invalidKey('INVALID_API_KEY', 'Bad key')
    expect(err.statusCode).toBe(401)
    expect(err.errorCode).toBe('INVALID_API_KEY')
    expect(err.message).toBe('Bad key')
  })

  it('missingKey() sets AUTHENTICATION_REQUIRED', () => {
    const err = AuthenticationError.missingKey()
    expect(err.statusCode).toBe(401)
    expect(err.errorCode).toBe('AUTHENTICATION_REQUIRED')
  })

  it('forbidden() sets 403', () => {
    const err = AuthenticationError.forbidden('FORBIDDEN', 'No access')
    expect(err.statusCode).toBe(403)
    expect(err.errorCode).toBe('FORBIDDEN')
    expect(err.message).toBe('No access')
  })
})

describe('ValidationError', () => {
  it('extends CubeConnectError with errors field', () => {
    const errors = { phone: ['The phone field is required.'] }
    const err = ValidationError.withErrors('VALIDATION_ERROR', 'Invalid', errors)
    expect(err).toBeInstanceOf(CubeConnectError)
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.name).toBe('ValidationError')
    expect(err.statusCode).toBe(422)
    expect(err.errorCode).toBe('VALIDATION_ERROR')
    expect(err.errors).toEqual(errors)
  })

  it('defaults errors to empty object', () => {
    const err = ValidationError.withErrors('VALIDATION_ERROR', 'Invalid')
    expect(err.errors).toEqual({})
  })
})

describe('NotFoundError', () => {
  it('extends CubeConnectError', () => {
    const err = NotFoundError.resource('TEMPLATE_NOT_FOUND', 'Template missing')
    expect(err).toBeInstanceOf(CubeConnectError)
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.name).toBe('NotFoundError')
    expect(err.statusCode).toBe(404)
    expect(err.errorCode).toBe('TEMPLATE_NOT_FOUND')
  })

  it('uses defaults', () => {
    const err = NotFoundError.resource()
    expect(err.errorCode).toBe('NOT_FOUND')
  })
})

describe('RateLimitError', () => {
  it('extends CubeConnectError', () => {
    const err = RateLimitError.exceeded('PLAN_LIMIT_REACHED', 'Limit hit')
    expect(err).toBeInstanceOf(CubeConnectError)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.name).toBe('RateLimitError')
    expect(err.statusCode).toBe(429)
    expect(err.errorCode).toBe('PLAN_LIMIT_REACHED')
  })

  it('uses defaults', () => {
    const err = RateLimitError.exceeded()
    expect(err.errorCode).toBe('RATE_LIMIT_EXCEEDED')
  })
})

describe('instanceof hierarchy', () => {
  it('all errors are instanceof CubeConnectError', () => {
    const errors = [
      AuthenticationError.invalidKey(),
      AuthenticationError.forbidden(),
      ValidationError.withErrors('VALIDATION_ERROR', 'err'),
      NotFoundError.resource(),
      RateLimitError.exceeded(),
    ]

    for (const err of errors) {
      expect(err).toBeInstanceOf(CubeConnectError)
      expect(err).toBeInstanceOf(Error)
    }
  })
})
