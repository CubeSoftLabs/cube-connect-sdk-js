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
}

/** بيانات استجابة الحملة من API */
export interface CampaignResponseData {
  campaignId: string
  name: string | null
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'scheduled'
  messageType: string
  totalCount: number
  sentCount: number
  failedCount: number
  scheduledAt: string | null
  createdAt: string
}

/** حمولة إرسال الرسالة الداخلية مع دعم الجدولة */
export interface ScheduledSendPayload extends SendPayload {
  scheduled_at?: string
  timezone?: string
}

/** بيانات قالب واحد من API */
export interface TemplateData {
  name: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED'
  paramsCount: number
  body: string | null
  header: string | null
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
