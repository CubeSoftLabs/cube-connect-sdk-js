import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CubeConnect } from '../src/client.js'
import { MessageResponse } from '../src/message-response.js'
import {
  CubeConnectError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from '../src/errors/index.js'

// ── Helpers ──────────────────────────────────────────

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }))
}

function mockFetchReject(error: Error): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
}

const API_KEY = 'test_key_123'
const successBody = {
  data: {
    status: 'queued',
    message_log_id: 4521,
    conversation_category: 'SERVICE',
    cost: 0.0,
  },
}

// ── Tests ────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CubeConnect constructor', () => {
  it('throws AuthenticationError when apiKey is missing', () => {
    expect(() => new CubeConnect({ apiKey: '' })).toThrow(AuthenticationError)
  })

  it('strips trailing slash from baseUrl', () => {
    const cube = new CubeConnect({ apiKey: API_KEY, baseUrl: 'https://example.com/' })
    mockFetch(202, successBody)

    cube.sendText('+966501234567', 'Hello')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/api/v1/messages/send'),
      expect.any(Object),
    )
  })
})

describe('sendText', () => {
  it('sends correct payload and returns MessageResponse', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    const result = await cube.sendText('+966501234567', 'Hello from JS!')

    expect(fetch).toHaveBeenCalledWith(
      'https://cubeconnect.io/api/v1/messages/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          phone: '+966501234567',
          message_type: 'text',
          data: { text: 'Hello from JS!' },
        }),
      }),
    )

    expect(result).toBeInstanceOf(MessageResponse)
    expect(result.status).toBe('queued')
    expect(result.messageLogId).toBe(4521)
    expect(result.queued()).toBe(true)
  })
})

describe('sendTemplate', () => {
  it('converts params to Meta components format', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    await cube.sendTemplate('+966501234567', 'order_confirmation', ['ORD-1234', '500 SAR'])

    const call = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(call[1]!.body as string)

    expect(body.message_type).toBe('template')
    expect(body.data.name).toBe('order_confirmation')
    expect(body.data.language_code).toBe('en_US')
    expect(body.data.components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'ORD-1234' },
          { type: 'text', text: '500 SAR' },
        ],
      },
    ])
  })

  it('sends without components when params is empty', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    await cube.sendTemplate('+966501234567', 'welcome_message')

    const call = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(call[1]!.body as string)

    expect(body.data.components).toBeUndefined()
    expect(body.data.name).toBe('welcome_message')
  })

  it('uses custom language code', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    await cube.sendTemplate('+966501234567', 'order_confirmation', ['ORD-1234'], 'ar')

    const call = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(call[1]!.body as string)

    expect(body.data.language_code).toBe('ar')
  })
})

describe('health', () => {
  it('returns health data without auth headers', async () => {
    const healthBody = {
      data: {
        status: 'healthy',
        checks: { app: true, database: true, cache: true },
        timestamp: '2026-02-28T12:00:00Z',
      },
    }
    mockFetch(200, healthBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    const result = await cube.health()

    expect(result.status).toBe('healthy')
    expect(result.checks.database).toBe(true)

    // health endpoint should use GET
    expect(fetch).toHaveBeenCalledWith(
      'https://cubeconnect.io/api/health',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('headers', () => {
  it('sends Authorization header', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    await cube.sendText('+966501234567', 'Hello')

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = (call[1] as any).headers

    expect(headers['Authorization']).toBe(`Bearer ${API_KEY}`)
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Accept']).toBe('application/json')
  })

  it('sends X-TENANT-ID when tenantId is set', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY, tenantId: 'tenant_123' })

    await cube.sendText('+966501234567', 'Hello')

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = (call[1] as any).headers

    expect(headers['X-TENANT-ID']).toBe('tenant_123')
  })

  it('omits X-TENANT-ID when tenantId is not set', async () => {
    mockFetch(202, successBody)
    const cube = new CubeConnect({ apiKey: API_KEY })

    await cube.sendText('+966501234567', 'Hello')

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = (call[1] as any).headers

    expect(headers['X-TENANT-ID']).toBeUndefined()
  })
})

describe('error handling', () => {
  it('401 throws AuthenticationError', async () => {
    mockFetch(401, {
      error: { code: 'INVALID_API_KEY', message: 'Invalid key' },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    await expect(cube.sendText('+966501234567', 'Hello'))
      .rejects.toThrow(AuthenticationError)

    try {
      await cube.sendText('+966501234567', 'Hello')
    } catch (e: any) {
      expect(e.statusCode).toBe(401)
      expect(e.errorCode).toBe('INVALID_API_KEY')
    }
  })

  it('403 throws AuthenticationError (forbidden)', async () => {
    mockFetch(403, {
      error: { code: 'FORBIDDEN', message: 'No access' },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    await expect(cube.sendText('+966501234567', 'Hello'))
      .rejects.toThrow(AuthenticationError)
  })

  it('404 throws NotFoundError', async () => {
    mockFetch(404, {
      error: { code: 'TEMPLATE_NOT_FOUND', message: 'Not found' },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    await expect(cube.sendTemplate('+966501234567', 'nonexistent'))
      .rejects.toThrow(NotFoundError)
  })

  it('422 throws ValidationError with errors field', async () => {
    mockFetch(422, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: { phone: ['The phone field is required.'] },
      },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    try {
      await cube.sendText('+966501234567', 'Hello')
    } catch (e: any) {
      expect(e).toBeInstanceOf(ValidationError)
      expect(e.statusCode).toBe(422)
      expect(e.errors).toEqual({ phone: ['The phone field is required.'] })
    }
  })

  it('429 throws RateLimitError', async () => {
    mockFetch(429, {
      error: { code: 'PLAN_LIMIT_REACHED', message: 'Limit reached' },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    await expect(cube.sendText('+966501234567', 'Hello'))
      .rejects.toThrow(RateLimitError)
  })

  it('500 throws CubeConnectError', async () => {
    mockFetch(500, {
      error: { code: 'INTERNAL_ERROR', message: 'Server error' },
    })
    const cube = new CubeConnect({ apiKey: API_KEY })

    await expect(cube.sendText('+966501234567', 'Hello'))
      .rejects.toThrow(CubeConnectError)
  })

  it('network error throws CubeConnectError with CONNECTION_FAILED', async () => {
    mockFetchReject(new TypeError('fetch failed'))
    const cube = new CubeConnect({ apiKey: API_KEY })

    try {
      await cube.sendText('+966501234567', 'Hello')
    } catch (e: any) {
      expect(e).toBeInstanceOf(CubeConnectError)
      expect(e.errorCode).toBe('CONNECTION_FAILED')
      expect(e.cause).toBeInstanceOf(TypeError)
    }
  })

  it('all errors are instanceof CubeConnectError', async () => {
    const errorResponses = [
      { status: 401, body: { error: { code: 'INVALID_API_KEY', message: '' } } },
      { status: 403, body: { error: { code: 'FORBIDDEN', message: '' } } },
      { status: 404, body: { error: { code: 'NOT_FOUND', message: '' } } },
      { status: 422, body: { error: { code: 'VALIDATION_ERROR', message: '', details: {} } } },
      { status: 429, body: { error: { code: 'RATE_LIMIT_EXCEEDED', message: '' } } },
      { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: '' } } },
    ]

    for (const { status, body } of errorResponses) {
      mockFetch(status, body)
      const cube = new CubeConnect({ apiKey: API_KEY })

      try {
        await cube.sendText('+966501234567', 'Hello')
      } catch (e: any) {
        expect(e).toBeInstanceOf(CubeConnectError)
      }
    }
  })
})
