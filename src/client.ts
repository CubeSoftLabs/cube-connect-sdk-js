import type {
  CubeConnectOptions,
  HealthResponse,
  SendPayload,
  SendOptions,
  CreateCampaignPayload,
  TemplateComponent,
  ApiErrorResponse,
} from './types.js'
import { MessageResponse } from './message-response.js'
import { CampaignResponse } from './campaign-response.js'
import {
  CubeConnectError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from './errors/index.js'

const DEFAULT_BASE_URL = 'https://cubeconnect.io'
const DEFAULT_TIMEOUT = 30_000

/**
 * عميل CubeConnect الرئيسي
 * يطابق CubeConnect.php في PHP SDK
 */
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

    this.apiKey = options.apiKey
    this.whatsappAccountId = options.whatsappAccountId
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.tenantId = options.tenantId
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT
  }

  /**
   * إرسال رسالة نصية إلى رقم واتساب.
   * يجب أن يكون المستلم قد راسلك خلال آخر 24 ساعة.
   * يمكن تحديد scheduledAt لإرسالها في وقت لاحق.
   */
  async sendText(phone: string, body: string, options?: SendOptions): Promise<MessageResponse> {
    const payload: SendPayload & { scheduled_at?: string; _tz?: string } = {
      whatsapp_account_id: this.whatsappAccountId,
      phone,
      message_type: 'text',
      data: { text: body },
    }

    if (options?.scheduledAt) {
      payload.scheduled_at = options.scheduledAt
    }

    if (options?.timezone) {
      payload._tz = options.timezone
    }

    return this.send(payload)
  }

  /**
   * إرسال قالب رسالة معتمد مسبقاً.
   * يمكن الإرسال في أي وقت بغض النظر عن نافذة 24 ساعة.
   * يمكن تحديد scheduledAt لإرسالها في وقت لاحق.
   */
  async sendTemplate(
    phone: string,
    name: string,
    params: string[] = [],
    languageCode: string = 'en_US',
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
          parameters: params.map((value) => ({
            type: 'text',
            text: String(value),
          })),
        },
      ]
      data.components = components
    }

    const payload: SendPayload & { scheduled_at?: string; _tz?: string } = {
      whatsapp_account_id: this.whatsappAccountId,
      phone,
      message_type: 'template',
      data,
    }

    if (options?.scheduledAt) {
      payload.scheduled_at = options.scheduledAt
    }

    if (options?.timezone) {
      payload._tz = options.timezone
    }

    return this.send(payload)
  }

  /**
   * إنشاء حملة جماعية (مع دعم الجدولة الاختيارية).
   * يُعيد CampaignResponse يحتوي على campaign_id والحالة الأولية.
   */
  async createCampaign(payload: CreateCampaignPayload): Promise<CampaignResponse> {
    const body = {
      whatsapp_account_id: this.whatsappAccountId,
      message_type:        payload.messageType,
      body:                payload.body,
      template_id:         payload.templateId,
      template_params:     payload.templateParams,
      recipients:          payload.recipients,
      campaign_name:       payload.campaignName,
      scheduled_at:        payload.scheduledAt,
      _tz:                 payload.timezone,
    }

    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        },
      )
    } catch (error) {
      throw CubeConnectError.connectionFailed(
        error instanceof Error ? error : undefined,
      )
    }

    await this.handleErrors(response)

    const json = await response.json()
    return CampaignResponse.fromResponse(json.data as Record<string, unknown>)
  }

  /**
   * جلب حالة حملة جماعية بمعرّفها.
   */
  async getCampaign(campaignId: string): Promise<CampaignResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns/${encodeURIComponent(campaignId)}`,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
      )
    } catch (error) {
      throw CubeConnectError.connectionFailed(
        error instanceof Error ? error : undefined,
      )
    }

    await this.handleErrors(response)

    const json = await response.json()
    return CampaignResponse.fromResponse(json.data as Record<string, unknown>)
  }

  /**
   * إلغاء حملة مجدولة لم تبدأ بعد.
   */
  async cancelCampaign(campaignId: string): Promise<{ success: boolean }> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/campaigns/${encodeURIComponent(campaignId)}/cancel`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify({}),
        },
      )
    } catch (error) {
      throw CubeConnectError.connectionFailed(
        error instanceof Error ? error : undefined,
      )
    }

    await this.handleErrors(response)

    const json = await response.json()
    return { success: (json.data as Record<string, unknown>)?.['success'] === true }
  }

  /**
   * فحص حالة المنصة.
   * لا يتطلب مصادقة.
   */
  async health(): Promise<HealthResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/health`,
        { method: 'GET' },
      )
    } catch (error) {
      throw CubeConnectError.connectionFailed(
        error instanceof Error ? error : undefined,
      )
    }

    if (!response.ok) {
      const body = await this.parseJson(response)
      const apiError = body?.error
      throw CubeConnectError.serverError(
        response.status,
        apiError?.code ?? '',
        apiError?.message ?? '',
      )
    }

    const body = await response.json()
    return body.data as HealthResponse
  }

  // ── Private ──────────────────────────────────────────────

  private async send(payload: SendPayload & { scheduled_at?: string }): Promise<MessageResponse> {
    let response: Response

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/messages/send`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(payload),
        },
      )
    } catch (error) {
      throw CubeConnectError.connectionFailed(
        error instanceof Error ? error : undefined,
      )
    }

    await this.handleErrors(response)

    const body = await response.json()
    return new MessageResponse(body.data)
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (this.tenantId) {
      headers['X-TENANT-ID'] = this.tenantId
    }

    return headers
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new CubeConnectError(
          `Request timed out after ${this.timeout}ms.`,
          0,
          'TIMEOUT',
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async handleErrors(response: Response): Promise<void> {
    if (response.ok) return

    const body = await this.parseJson(response)
    const apiError = body?.error
    const code = apiError?.code ?? ''
    const message = apiError?.message ?? ''
    const details = apiError?.details ?? {}
    const status = response.status

    switch (status) {
      case 401:
        throw AuthenticationError.invalidKey(code, message)
      case 403:
        throw AuthenticationError.forbidden(code, message)
      case 404:
        throw NotFoundError.resource(code, message)
      case 422:
        throw ValidationError.withErrors(code, message, details)
      case 429:
        throw RateLimitError.exceeded(code, message)
      default:
        throw CubeConnectError.serverError(status, code, message)
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
