import type { CampaignResponseData } from './types.js'

/**
 * استجابة الحملة الجماعية
 * تُعاد من createCampaign() و getCampaign()
 */
export class CampaignResponse {
  readonly campaignId: string
  readonly name: string | null
  readonly status: CampaignResponseData['status']
  readonly messageType: string
  readonly totalCount: number
  readonly sentCount: number
  readonly failedCount: number
  readonly scheduledAt: string | null
  readonly createdAt: string

  constructor(data: CampaignResponseData) {
    this.campaignId = data.campaignId
    this.name = data.name
    this.status = data.status
    this.messageType = data.messageType
    this.totalCount = data.totalCount
    this.sentCount = data.sentCount
    this.failedCount = data.failedCount
    this.scheduledAt = data.scheduledAt
    this.createdAt = data.createdAt
  }

  /**
   * بناء كائن CampaignResponse من استجابة API الخام
   */
  static fromResponse(raw: Record<string, unknown>): CampaignResponse {
    return new CampaignResponse({
      campaignId:   String(raw['campaign_id'] ?? ''),
      name:         raw['name'] != null ? String(raw['name']) : null,
      status:       (raw['status'] as CampaignResponseData['status']) ?? 'pending',
      messageType:  String(raw['message_type'] ?? ''),
      totalCount:   Number(raw['total_count'] ?? 0),
      sentCount:    Number(raw['sent_count'] ?? 0),
      failedCount:  Number(raw['failed_count'] ?? 0),
      scheduledAt:  raw['scheduled_at'] != null ? String(raw['scheduled_at']) : null,
      createdAt:    String(raw['created_at'] ?? ''),
    })
  }

  /** هل الحملة مجدولة (لم تبدأ بعد)؟ */
  isScheduled(): boolean {
    return this.status === 'scheduled' || (this.status === 'pending' && this.scheduledAt !== null)
  }

  /** هل اكتملت الحملة؟ */
  isCompleted(): boolean {
    return this.status === 'completed'
  }

  /** هل تم إلغاء الحملة؟ */
  isCancelled(): boolean {
    return this.status === 'cancelled'
  }

  /** تحويل إلى كائن بسيط */
  toObject(): CampaignResponseData {
    return {
      campaignId:   this.campaignId,
      name:         this.name,
      status:       this.status,
      messageType:  this.messageType,
      totalCount:   this.totalCount,
      sentCount:    this.sentCount,
      failedCount:  this.failedCount,
      scheduledAt:  this.scheduledAt,
      createdAt:    this.createdAt,
    }
  }
}
