import { describe, it, expect, vi, afterEach } from 'vitest'
import { CubeConnect } from '../src/client.js'
import { CubeConnectError, TimeoutError } from '../src/errors/index.js'

const opts = { apiKey: 'k', whatsappAccountId: 'acc_1', baseUrl: 'https://example.com', timeout: 50 }
const campaign = { messageType: 'text' as const, body: 'hi', recipients: [{ phone: '966500000001' }] }

afterEach(() => vi.restoreAllMocks())

describe('timeout is no longer reported as a connection failure', () => {
  it('surfaces TimeoutError with REQUEST_TIMEOUT', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(
      Object.assign(new DOMException('aborted', 'AbortError')),
    )))

    const cube = new CubeConnect(opts)
    await expect(cube.createCampaign(campaign)).rejects.toBeInstanceOf(TimeoutError)
    await expect(cube.createCampaign(campaign)).rejects.toMatchObject({ errorCode: 'REQUEST_TIMEOUT' })
  })

  it('still reports a genuine connection failure as CONNECTION_FAILED', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))))

    const cube = new CubeConnect(opts)
    await expect(cube.createCampaign(campaign)).rejects.toMatchObject({ errorCode: 'CONNECTION_FAILED' })
    await expect(cube.createCampaign(campaign)).rejects.toBeInstanceOf(CubeConnectError)
  })
})

describe('idempotency key', () => {
  const capture = () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      seen.push((init.headers as Record<string, string>)['Idempotency-Key'])
      return Promise.resolve(new Response(
        JSON.stringify({ success: true, data: { campaign_id: 'c1', status: 'preparing', requested_count: 1 } }),
        { status: 202, headers: { 'Content-Type': 'application/json' } },
      ))
    }))
    return seen
  }

  it('derives the same key for an identical campaign, and a different one otherwise', async () => {
    const seen = capture()
    const cube = new CubeConnect(opts)

    await cube.createCampaign(campaign)
    await cube.createCampaign(campaign)
    await cube.createCampaign({ ...campaign, body: 'different' })

    expect(seen[0]).toBe(seen[1])          // retry of the same call → same key
    expect(seen[0]).not.toBe(seen[2])      // a different campaign → different key
    expect(seen[0]).toMatch(/^sdk-[0-9a-f]{64}$/)
  })

  it('honours an explicit key', async () => {
    const seen = capture()
    await new CubeConnect(opts).createCampaign({ ...campaign, idempotencyKey: 'mine-1' })
    expect(seen[0]).toBe('mine-1')
  })

  it('exposes the prepare lifecycle on the response', async () => {
    capture()
    const res = await new CubeConnect(opts).createCampaign(campaign)
    expect(res.isPreparing()).toBe(true)
    expect(res.requestedCount).toBe(1)
    expect(res.totalCount).toBe(0)
  })
})
