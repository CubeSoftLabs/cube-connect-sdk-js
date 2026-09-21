/** خيارات إنشاء العميل */
export interface CubeConnectOptions {
  /** مفتاح API — مطلوب */
  apiKey: string
  /** معرّف حساب واتساب — مطلوب. Dashboard → WhatsApp Numbers → "API ID:" */
  whatsappAccountId: string
  /** رابط API الأساسي (الافتراضي: https://cubeconnect.io) */
  baseUrl?: string
  /** معرّف المستأجر — للحسابات متعددة المستأجرين */
  tenantId?: string
  /** مهلة الطلب بالمللي ثانية (الافتراضي: 30000) */
  timeout?: number
}

/** بيانات استجابة الرسالة من API */
export interface MessageResponseData {
  status: string
  message_log_id: string
  conversation_category: string
  cost: number
}

/** استجابة فحص صحة المنصة */
export interface HealthResponse {
  status: string
  checks: {
    app: boolean
    database: boolean
    cache: boolean
  }
  timestamp: string
}

/** مكوّن قالب Meta */
export interface TemplateComponent {
  type: string
  parameters: TemplateParameter[]
}

/** معامل قالب Meta */
export interface TemplateParameter {
  type: string
  text: string
}

/** حمولة إرسال الرسالة (داخلي) */
export interface SendPayload {
  whatsapp_account_id: string
  phone: string
  message_type: 'text' | 'template'
  data: Record<string, unknown>
}

/** هيكل خطأ API */
export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

/** خيارات إرسال الرسائل (اختيارية) */
export interface SendOptions {
  /** وقت الإرسال المجدول — ISO 8601 (مثال: "2026-05-01T10:00:00") */
  scheduledAt?: string
  /** المنطقة الزمنية — IANA (مثال: "Asia/Riyadh"). مطلوب عند تمرير scheduledAt */
  timezone?: string
  /** Override the default whatsappAccountId set in the constructor */
  whatsappAccountId?: string
  /**
   * Opt-in 26-hour auto-retry for template messages that fail with Meta
   * error 131049 (per-recipient marketing frequency cap). One retry per
   * chain — the retry itself never auto-retries again. Useful for marketing
   * campaigns where you'd rather have the message land 26h late than not
   * at all. Recommended OFF for transactional/utility templates.
   */
  autoRetryOnFrequencyCap?: boolean
}

/** مستلم واحد في حملة جماعية */
export interface CampaignRecipient {
  /** رقم الهاتف بالتنسيق الدولي */
  phone: string
  /** اسم المستلم (اختياري) */
  name?: string
  /** متغيرات مخصصة لهذا المستلم (اختياري) */
  variables?: Record<string, string>
}

/** حمولة إنشاء حملة جماعية */
export interface CreateCampaignPayload {
  /** نوع الرسالة */
  messageType: 'text' | 'template'
  /** نص الرسالة (للرسائل النصية) */
  body?: string
  /** اسم القالب المعتمد (للقوالب) — مثال: "order_confirmation" */
  templateName?: string
  /** رمز اللغة (اختياري) — مثال: "ar", "en_US" */
  templateLanguage?: string
  /** معاملات القالب */
  templateParams?: string[]
  /** قائمة المستلمين */
  recipients: CampaignRecipient[]
  /** اسم الحملة (اختياري) */
  campaignName?: string
  /** وقت الإرسال المجدول — ISO 8601 (اختياري، مثال: "2026-05-01T10:00:00") */
  scheduledAt?: string
  /** المنطقة الزمنية — IANA (مطلوب عند تمرير scheduledAt، مثال: "Asia/Riyadh") */
  timezone?: string
  /** Override the default whatsappAccountId set in the constructor */
  whatsappAccountId?: string
  /**
   * قسّم القائمة على أيام بدل رفضها عند تجاوز الحد اليومي.
   *
   * With this off (the default) an oversized list returns
   * MESSAGING_TIER_LIMIT_EXCEEDED, unchanged — so code that already splits on
   * that error does not end up splitting twice. With it on, the campaign comes
   * back divided into parts (see CampaignResponse.parts).
   */
  splitAcrossDays?: boolean
  /**
   * مفتاح idempotency لتجميع إعادات المحاولة.
   * Leave unset to derive a stable key from the payload, so retrying an
   * identical call after a timeout returns the original campaign instead of
   * creating a second one. Set it yourself to send the same campaign twice.
   */
  idempotencyKey?: string
}

/** جزء من حملة قُسّمت على أيام لتناسب الحد اليومي للرقم */
export interface CampaignPartData {
  campaignId: string
  name: string | null
  /** 1-based position in the send order. */
  partNumber: number
  status: string
  /** Recipients allotted to this part. */
  requestedCount: number
  /** ISO 8601; null means it starts immediately. */
  scheduledAt: string | null
}

/** بيانات استجابة الحملة من API */
export interface CampaignResponseData {
  campaignId: string
  name: string | null
  status: 'preparing' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'scheduled'
  messageType: string
  /** Recipients you submitted. Final from the very first response. */
  requestedCount: number
  /** Deliverable recipients after opt-out filtering. 0 while status is `preparing`. */
  totalCount: number
  /** Why preparation failed, when status is `failed`. */
  failureReason: string | null
  sentCount: number
  /** Subset of sentCount that Meta confirmed reached the recipient (via delivery webhook). */
  deliveredCount: number
  /** Subset of sentCount that Meta confirmed the recipient opened (via read webhook). */
  readCount: number
  failedCount: number
  scheduledAt: string | null
  createdAt: string
  /** Set when the campaign was split across days. */
  campaignGroupId: string | null
  /** How many parts the split produced; null when not split. */
  partsTotal: number | null
  /** Every part, in send order. Empty when not split. */
  parts: CampaignPartData[]
}

/** حمولة إرسال الرسالة الداخلية مع دعم الجدولة */
export interface ScheduledSendPayload extends SendPayload {
  scheduled_at?: string
  timezone?: string
}

/** Header format for a template. `text` carries inline text; `image`/`video`/`document`
 *  require a media parameter (link or id) to be sent in `components.header.parameters`
 *  at send time. `none` means the template has no header. */
export type TemplateHeaderType = 'none' | 'text' | 'image' | 'video' | 'document'

/** بيانات قالب واحد من API */
export interface TemplateData {
  name: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED'
  paramsCount: number
  body: string | null
  /** Header text — populated only when `headerType === 'text'`. */
  header: string | null
  /** Always present. Tells the caller whether (and what kind of) media is required. */
  headerType: TemplateHeaderType
  /** Sample media URL Meta has on file (set at template creation). Populated only
   *  when `headerType` is `image`/`video`/`document`. Callers may reuse this URL
   *  on send, or pass their own media via the `header` component parameter. */
  headerSampleMediaUrl: string | null
  footer: string | null
}

/** نتيجة تسليم مستلم واحد في حملة */
export interface CampaignRecipientResult {
  phone: string
  name: string | null
  /** pending | sent | failed */
  status: string
  messageLogId: string | null
  errorMessage: string | null
  sentAt: string | null
}

/** صفحة نتائج مستلمي حملة مع بيانات التصفح */
export interface CampaignRecipientsPage {
  campaignId: string
  recipients: CampaignRecipientResult[]
  pagination: {
    currentPage: number
    perPage: number
    total: number
    lastPage: number
  }
}

/** Opt-out scope: 'marketing' suppresses promotional only; 'all' is a full block. */
export type OptOutScope = 'marketing' | 'all'

/** A single opt-out (unsubscribe) record. */
export interface OptOutRecord {
  phone: string
  scope: OptOutScope
  source: string
  optedOutAt: string | null
}

/** Result of checking a single number's opt-out status. */
export interface OptOutStatus {
  phone: string
  optedOut: boolean
  scope: OptOutScope | null
  source: string | null
  optedOutAt: string | null
}

/** Paginated opt-out list. */
export interface OptOutsPage {
  optOuts: OptOutRecord[]
  pagination: {
    currentPage: number
    perPage: number
    total: number
    lastPage: number
  }
}

/** بيانات حالة رسالة واحدة */
export interface MessageStatusResponseData {
  messageLogId: string
  status: string
  toPhone: string
  messageType: string
  metaMessageId: string | null
  sentAt: string | null
  scheduledAt: string | null
  costAmount: number
  costCurrency: string
  errorMessage: string | null
  createdAt: string
}
