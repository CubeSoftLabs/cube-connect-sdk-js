import type {
  CubeConnectOptions,
  HealthResponse,
  SendPayload,
  SendOptions,
  CreateCampaignPayload,
  CampaignRecipientsPage,
  TemplateComponent,
  TemplateData,
  ApiErrorResponse,
  OptOutScope,
  OptOutRecord,
  OptOutStatus,
  OptOutsPage,
} from './types.js'
import { MessageResponse } from './message-response.js'
import { MessageStatusResponse } from './message-status-response.js'
import { CampaignResponse } from './campaign-response.js'
import {
  CubeConnectError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors/index.js'

const DEFAULT_BASE_URL = 'https://cubeconnect.io'
const DEFAULT_TIMEOUT  = 30_000

export class CubeConnect {
  private readonly apiKey: string
  private readonly whatsappAccountId: string
  private readonly baseUrl: string
  private readonly tenantId: string | undefined
  private readonly timeout: number

  constructor(options: CubeConnectOptions) {
    if (!options.apiKey) {
      throw AuthenticationError.missingKey()
    }

    if (!options.whatsappAccountId) {
      throw new Error('CubeConnect: whatsappAccountId is required. Find it in Dashboard → WhatsApp Numbers → API ID:')
    }

    this.apiKey            = options.apiKey
    this.whatsappAccountId = options.whatsappAccountId
    this.baseUrl           = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.tenantId          = options.tenantId
    this.timeout           = options.timeout ?? DEFAULT_TIMEOUT
  }

  /** Send a pre-approved template message. Params map to {{1}}, {{2}}, etc. */
  async sendTemplate(
    phone: string,
    name: string,
    languageCode: string,
    params: string[] = [],
    options?: SendOptions,
  ): Promise<MessageResponse> {
    const data: Record<string, unknown> = {
      name,
      language_code: languageCode,
    }

    if (params.length > 0) {
      const components: TemplateComponent[] = [
        {
          type: 'body',
          parameters: params.map((value) => ({ type: 'text', text: String(value) })),
        },
      ]
      data.components = components
    }

    const payload: SendPayload & {
      scheduled_at?: string
      timezone?: string
      auto_retry_on_frequency_cap?: boolean
    } = {
      whatsapp_account_id: options?.whatsappAccountId ?? this.whatsappAccountId,
      phone,
      message_type: 'template',
      data,
    }

    if (options?.scheduledAt)                payload.scheduled_at                 = options.scheduledAt
    if (options?.timezone)                   payload.timezone                     = options.timezone
    if (options?.autoRetryOnFrequencyCap)    payload.auto_retry_on_frequency_cap  = true

    return this.send(payload)
  }

  /** Create a bulk campaign. Pass whatsappAccountId inside payload to override the default. */
  /**
   * أنشئ حملة جماعية.
   *
   * The API answers as soon as it accepts the list, before the recipient rows
   * exist, so the campaign can come back with status `preparing` and totalCount
   * 0. Use `requestedCount` for what you submitted, and `getCampaign()` (or the
   * campaign.created webhook) for the final tally.
   *
   * Set `splitAcrossDays` for a list larger than the number's remaining daily
   * allowance: instead of a MESSAGING_TIER_LIMIT_EXCEEDED error the campaign
   * comes back divided into parts (see `response.parts`). Left off, the error
   * behaviour is unchanged, so code that already splits on it is not split twice.
   *
   * Idempotency: every create carries an Idempotency-Key. Leave
   * `payload.idempotencyKey` unset and one is derived from the payload, so
   * re-issuing an identical call after a timeout returns the original campaign
   * instead of creating a second one. Set it yourself to control the grouping —
   * including when you deliberately want to send the same campaign twice.
   */
  async createCampaign(payload: CreateCampaignPayload): Promise<CampaignResponse> {
    const body = {
      whatsapp_account_id: payload.whatsappAccountId ?? this.whatsappAccountId,
      message_type:        payload.messageType,
      body:                payload.body,
      template_name:       payload.templateName,
      template_language:   payload.templateLanguage,
      template_params:     payload.templateParams,
      recipients:          payload.recipients,
      campaign_name:       payload.campaignName,
      scheduled_at:        payload.scheduledAt,
      timezone:            payload.timezone,
      split_across_days:   payload.splitAcrossDays,
    }

    const idempotencyKey = payload.idempotencyKey ?? await this.deriveIdempotencyKey(body)

    let response: Response

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/campaigns`, {
        method: 'POST',
        headers: { ...this.buildHeaders(), 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      })
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    return CampaignResponse.fromResponse(json.data as Record<string, unknown>)
  }

  /** Retrieve campaign status and statistics. */
  async getCampaign(campaignId: string): Promise<CampaignResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns/${encodeURIComponent(campaignId)}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    return CampaignResponse.fromResponse(json.data as Record<string, unknown>)
  }

  /** Get paginated list of campaign recipients with their delivery status. */
  async getCampaignRecipients(
    campaignId: string,
    options?: { page?: number; perPage?: number; status?: string },
  ): Promise<CampaignRecipientsPage> {
    const params = new URLSearchParams()
    if (options?.page)    params.set('page',     String(options.page))
    if (options?.perPage) params.set('per_page', String(options.perPage))
    if (options?.status)  params.set('status',   options.status)

    const qs = params.size > 0 ? `?${params}` : ''

    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns/${encodeURIComponent(campaignId)}/recipients${qs}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const data = json.data as Record<string, unknown>
    const rawRecipients = (data['recipients'] as Array<Record<string, unknown>>) ?? []
    const rawPagination = (data['pagination'] as Record<string, number>) ?? {}

    return {
      campaignId: data['campaign_id'] as string,
      recipients: rawRecipients.map((r) => ({
        phone:         r['phone'] as string,
        name:          (r['name'] as string | null) ?? null,
        status:        r['status'] as string,
        messageLogId:  (r['message_log_id'] as string | null) ?? null,
        errorMessage:  (r['error_message'] as string | null) ?? null,
        sentAt:        (r['sent_at'] as string | null) ?? null,
      })),
      pagination: {
        currentPage: rawPagination['current_page'] ?? 1,
        perPage:     rawPagination['per_page'] ?? 50,
        total:       rawPagination['total'] ?? 0,
        lastPage:    rawPagination['last_page'] ?? 1,
      },
    }
  }

  /** Cancel a scheduled campaign that has not yet started. */
  async cancelCampaign(campaignId: string): Promise<{ success: boolean }> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns/${encodeURIComponent(campaignId)}/cancel`,
        { method: 'POST', headers: this.buildHeaders(), body: JSON.stringify({}) },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    return { success: (json.data as Record<string, unknown>)?.['success'] === true }
  }

  /** Get the current delivery status of a sent message. */
  async getMessageStatus(messageLogId: string): Promise<MessageStatusResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/messages/${encodeURIComponent(messageLogId)}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    return MessageStatusResponse.fromResponse(json.data as Record<string, unknown>)
  }

  /** List templates. Pass whatsappAccountId in options to override the default. Pass status to filter (e.g. 'APPROVED'). */
  async getTemplates(options?: { status?: string; whatsappAccountId?: string }): Promise<TemplateData[]> {
    const params = new URLSearchParams({ whatsapp_account_id: options?.whatsappAccountId ?? this.whatsappAccountId })
    if (options?.status) params.set('status', options.status)

    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/templates?${params}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const raw = json.data as Array<Record<string, unknown>>
    return raw.map((t) => ({
      name:                 t['name'] as string,
      language:             t['language'] as string,
      category:             t['category'] as TemplateData['category'],
      status:               t['status'] as TemplateData['status'],
      paramsCount:          t['params_count'] as number,
      body:                 (t['body'] as string | null) ?? null,
      header:               (t['header'] as string | null) ?? null,
      headerType:           (t['header_type'] as TemplateData['headerType']) ?? 'none',
      headerSampleMediaUrl: (t['header_sample_media_url'] as string | null) ?? null,
      footer:               (t['footer'] as string | null) ?? null,
    }))
  }

  /** Check the platform health status. No authentication required. */
  async health(): Promise<HealthResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/api/health`, { method: 'GET' })
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    if (!response.ok) {
      const body = await this.parseJson(response)
      const apiError = body?.error
      throw CubeConnectError.serverError(response.status, apiError?.code ?? '', apiError?.message ?? '')
    }

    const body = await response.json()
    return body.data as HealthResponse
  }

  /** Add a number to the opt-out (unsubscribe) list. Scope defaults to 'marketing'. */
  async addOptOut(phone: string, scope: OptOutScope = 'marketing'): Promise<OptOutRecord> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/opt-outs`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ phone, scope }),
      })
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const d = json.data as Record<string, unknown>
    return {
      phone:      d['phone'] as string,
      scope:      d['scope'] as OptOutScope,
      source:     (d['source'] as string | undefined) ?? 'api',
      optedOutAt: (d['opted_out_at'] as string | null) ?? null,
    }
  }

  /** Remove a number from the opt-out list (re-subscribe). */
  async removeOptOut(phone: string): Promise<{ phone: string; removed: boolean }> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/opt-outs/${encodeURIComponent(phone)}`,
        { method: 'DELETE', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const d = json.data as Record<string, unknown>
    return { phone: d['phone'] as string, removed: d['removed'] === true }
  }

  /** Check whether a single number is opted out. */
  async getOptOut(phone: string): Promise<OptOutStatus> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/opt-outs/${encodeURIComponent(phone)}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const d = json.data as Record<string, unknown>
    return {
      phone:      d['phone'] as string,
      optedOut:   d['opted_out'] === true,
      scope:      (d['scope'] as OptOutScope | null) ?? null,
      source:     (d['source'] as string | null) ?? null,
      optedOutAt: (d['opted_out_at'] as string | null) ?? null,
    }
  }

  /** List opted-out numbers, optionally filtered by scope or phone substring. */
  async listOptOuts(options?: { scope?: OptOutScope; phone?: string; perPage?: number }): Promise<OptOutsPage> {
    const params = new URLSearchParams()
    if (options?.scope)   params.set('scope',    options.scope)
    if (options?.phone)   params.set('phone',    options.phone)
    if (options?.perPage) params.set('per_page', String(options.perPage))

    const qs = params.size > 0 ? `?${params}` : ''

    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/opt-outs${qs}`,
        { method: 'GET', headers: this.buildHeaders() },
      )
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const json = await response.json()
    const data = json.data as Record<string, unknown>
    const rawList = (data['opt_outs'] as Array<Record<string, unknown>>) ?? []
    const rawPagination = (data['pagination'] as Record<string, number>) ?? {}

    return {
      optOuts: rawList.map((o) => ({
        phone:      o['phone'] as string,
        scope:      o['scope'] as OptOutScope,
        source:     (o['source'] as string) ?? 'api',
        optedOutAt: (o['opted_out_at'] as string | null) ?? null,
      })),
      pagination: {
        currentPage: rawPagination['current_page'] ?? 1,
        perPage:     rawPagination['per_page'] ?? 50,
        total:       rawPagination['total'] ?? 0,
        lastPage:    rawPagination['last_page'] ?? 1,
      },
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async send(payload: SendPayload & { scheduled_at?: string }): Promise<MessageResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/messages/send`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
      })
    } catch (error) {
      throw CubeConnectError.fromTransportFailure(error)
    }

    await this.handleErrors(response)

    const body = await response.json()
    return new MessageResponse(body.data)
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    }

    if (this.tenantId) {
      headers['X-TENANT-ID'] = this.tenantId
    }

    return headers
  }

  /**
   * اشتق مفتاح idempotency ثابتاً من الحملة نفسها.
   *
   * Same campaign, same key — so a retry after a timeout is recognised as the
   * same request. Uses Web Crypto (Node 18+ and every modern browser) and falls
   * back to a stable string hash where it is unavailable.
   */
  private async deriveIdempotencyKey(body: unknown): Promise<string> {
    const json = JSON.stringify(body)
    const subtle = globalThis.crypto?.subtle

    if (subtle) {
      const digest = await subtle.digest('SHA-256', new TextEncoder().encode(json))
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      return `sdk-${hex}`
    }

    // FNV-1a over two offsets — weaker than SHA-256 but stable and dependency-free.
    const fnv = (seed: number): string => {
      let h = seed
      for (let i = 0; i < json.length; i++) {
        h ^= json.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
      }
      return h.toString(16).padStart(8, '0')
    }

    return `sdk-${fnv(0x811c9dc5)}${fnv(0x7fffffff)}-${json.length.toString(16)}`
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), this.timeout)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(this.timeout, error)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async handleErrors(response: Response): Promise<void> {
    if (response.ok) return

    const body    = await this.parseJson(response)
    const apiError = body?.error
    const code    = apiError?.code ?? ''
    const message = apiError?.message ?? ''
    const details = apiError?.details ?? {}
    const status  = response.status

    switch (status) {
      case 401: throw AuthenticationError.invalidKey(code, message)
      case 403: throw AuthenticationError.forbidden(code, message)
      case 404: throw NotFoundError.resource(code, message)
      case 422: throw ValidationError.withErrors(code, message, details)
      case 429: throw RateLimitError.exceeded(code, message)
      default:  throw CubeConnectError.serverError(status, code, message)
    }
  }

  private async parseJson(response: Response): Promise<ApiErrorResponse | null> {
    try {
      return await response.json() as ApiErrorResponse
    } catch {
      return null
    }
  }
}
