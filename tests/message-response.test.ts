import { describe, it, expect } from 'vitest'
import { MessageResponse } from '../src/message-response.js'

describe('MessageResponse', () => {
  const sampleData = {
    status: 'queued',
    message_log_id: 4521,
    conversation_category: 'SERVICE',
    cost: 0.0235,
  }

  it('maps snake_case API fields to camelCase properties', () => {
    const res = new MessageResponse(sampleData)
    expect(res.status).toBe('queued')
    expect(res.messageLogId).toBe(4521)
    expect(res.conversationCategory).toBe('SERVICE')
    expect(res.cost).toBe(0.0235)
  })

  it('queued() returns true when status is "queued"', () => {
    const res = new MessageResponse(sampleData)
    expect(res.queued()).toBe(true)
  })

  it('queued() returns false for other statuses', () => {
    const res = new MessageResponse({ ...sampleData, status: 'failed' })
    expect(res.queued()).toBe(false)
  })

  it('toArray() returns snake_case object', () => {
    const res = new MessageResponse(sampleData)
    expect(res.toArray()).toEqual(sampleData)
  })

  it('handles missing fields gracefully', () => {
    const res = new MessageResponse({} as any)
    expect(res.status).toBe('')
    expect(res.messageLogId).toBe(0)
    expect(res.conversationCategory).toBe('')
    expect(res.cost).toBe(0)
    expect(res.queued()).toBe(false)
  })
})
