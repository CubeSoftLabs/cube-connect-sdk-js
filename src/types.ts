/** خيارات إنشاء العميل */
export interface CubeConnectOptions {
  /** مفتاح API — مطلوب */
  apiKey: string
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
  message_log_id: number
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
