import { createHmac, timingSafeEqual } from 'node:crypto'

/** أنواع أحداث الويب هوك المدعومة */
export type WebhookEventType =
  | 'message.status_updated'
  | 'message.received'
  | 'campaign.created'
  | 'campaign.started'
  | 'campaign.completed'
  | 'template.submitted'
  | 'template.status_changed'
  | 'flow.session_started'
  | 'flow.session_completed'
  | 'flow.session_cancelled'
  | 'account.quality_event'
  | 'webhook.test'

/** حمولة الويب هوك الأساسية */
export interface WebhookPayload {
  event: WebhookEventType
  tenant_id: number
  timestamp: string
  [key: string]: unknown
}

/**
 * خيارات التحقق من التوقيع
 */
export interface VerifyOptions {
  /** محتوى الطلب الخام */
  payload: string
  /** قيمة هيدر X-Webhook-Signature */
  signature: string
  /** قيمة هيدر X-Webhook-Timestamp */
  timestamp: string
  /** مفتاح التوقيع السري */
  secret: string
  /** أقصى فرق زمني بالمللي ثانية (الافتراضي: 300000 = 5 دقائق) */
  tolerance?: number
}

/**
 * التحقق من توقيع الويب هوك (HMAC-SHA256).
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature } from '@cubesoftware/cube-connect-sdk-js'
 *
 * const isValid = verifyWebhookSignature({
 *   payload: req.body,
 *   signature: req.headers['x-webhook-signature'],
 *   timestamp: req.headers['x-webhook-timestamp'],
 *   secret: process.env.CUBECONNECT_WEBHOOK_SECRET,
 * })
 * ```
 */
export function verifyWebhookSignature(options: VerifyOptions): boolean {
  const { payload, signature, timestamp, secret, tolerance = 300_000 } = options

  if (!signature || !timestamp || !secret) {
    return false
  }

  // منع هجمات الإعادة
  const requestTime = new Date(timestamp).getTime()
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > tolerance) {
    return false
  }

  const expected = createHmac('sha256', secret)
    .update(timestamp + '.' + payload)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/**
 * كلاس لتمثيل حدث ويب هوك وارد من CubeConnect.
 *
 * @example
 * ```ts
 * import { WebhookEvent } from '@cubesoftware/cube-connect-sdk-js'
 *
 * const event = new WebhookEvent(req.body)
 *
 * if (event.isMessageReceived()) {
 *   console.log(`New message from ${event.get('from')}: ${event.get('content')}`)
 * }
 * ```
 */
export class WebhookEvent {
  /** نوع الحدث */
  readonly event: WebhookEventType
  /** معرّف المستأجر */
  readonly tenantId: number
  /** وقت الحدث */
  readonly timestamp: string
  /** البيانات الكاملة */
  readonly data: WebhookPayload

  constructor(payload: WebhookPayload) {
    this.event = payload.event
    this.tenantId = payload.tenant_id
    this.timestamp = payload.timestamp
    this.data = payload
  }

  /** هل الحدث من نوع معين؟ */
  is(eventName: WebhookEventType): boolean {
    return this.event === eventName
  }

  /** فئة الحدث (message, campaign, template, flow, account, webhook) */
  category(): string {
    return this.event.split('.')[0] ?? ''
  }

  /** هل هو حدث اختبار؟ */
  isTest(): boolean {
    return this.event === 'webhook.test'
  }

  /** الحصول على قيمة من بيانات الحدث */
  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined
  }

  /** تحويل لكائن عادي */
  toObject(): WebhookPayload {
    return { ...this.data }
  }

  // ── أحداث الرسائل ──

  isMessageStatusUpdated(): boolean {
    return this.event === 'message.status_updated'
  }

  isMessageReceived(): boolean {
    return this.event === 'message.received'
  }

  // ── أحداث الحملات ──

  isCampaignCreated(): boolean {
    return this.event === 'campaign.created'
  }

  isCampaignStarted(): boolean {
    return this.event === 'campaign.started'
  }

  isCampaignCompleted(): boolean {
    return this.event === 'campaign.completed'
  }

  // ── أحداث القوالب ──

  isTemplateSubmitted(): boolean {
    return this.event === 'template.submitted'
  }

  isTemplateStatusChanged(): boolean {
    return this.event === 'template.status_changed'
  }

  // ── أحداث الفلو ──

  isFlowSessionStarted(): boolean {
    return this.event === 'flow.session_started'
  }

  isFlowSessionCompleted(): boolean {
    return this.event === 'flow.session_completed'
  }

  isFlowSessionCancelled(): boolean {
    return this.event === 'flow.session_cancelled'
  }

  // ── أحداث الجودة ──

  isQualityEvent(): boolean {
    return this.event === 'account.quality_event'
  }
}
