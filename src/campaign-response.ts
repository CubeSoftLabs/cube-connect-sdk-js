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
  /** Recipients you submitted. Final from the very first response. */
  readonly requestedCount: number
  /** Deliverable recipients after opt-out filtering. 0 while status is `preparing`. */
  readonly totalCount: number
  /** Why preparation failed, when status is `failed`. */
  readonly failureReason: string | null
  readonly sentCount: number
  /** Subset of sentCount that Meta confirmed reached the recipient (via delivery webhook). */
  readonly deliveredCount: number
  /** Subset of sentCount that Meta confirmed the recipient opened (via read webhook). */
  readonly readCount: number
  readonly failedCount: number
  readonly scheduledAt: string | null
  readonly createdAt: string

  constructor(data: CampaignResponseData) {
    this.campaignId = data.campaignId
    this.name = data.name
    this.status = data.status
    this.messageType = data.messageType
    this.requestedCount = data.requestedCount
    this.totalCount = data.totalCount
    this.failureReason = data.failureReason
    this.sentCount = data.sentCount
    this.deliveredCount = data.deliveredCount
    this.readCount = data.readCount
    this.failedCount = data.failedCount
    this.scheduledAt = data.scheduledAt
    this.createdAt = data.createdAt
  }

  /**
   * بناء كائن CampaignResponse من استجابة API الخام
   */
  static fromResponse(raw: Record<string, unknown>): CampaignResponse {
    return new CampaignResponse({
      campaignId:     String(raw['campaign_id'] ?? ''),
      name:           raw['name'] != null ? String(raw['name']) : null,
      status:         (raw['status'] as CampaignResponseData['status']) ?? 'pending',
      messageType:    String(raw['message_type'] ?? ''),
      requestedCount: Number(raw['requested_count'] ?? raw['total_count'] ?? 0),
      totalCount:     Number(raw['total_count'] ?? 0),
      failureReason:  raw['failure_reason'] != null ? String(raw['failure_reason']) : null,
      sentCount:      Number(raw['sent_count'] ?? 0),
      deliveredCount: Number(raw['delivered_count'] ?? 0),
      readCount:      Number(raw['read_count'] ?? 0),
      failedCount:    Number(raw['failed_count'] ?? 0),
      scheduledAt:    raw['scheduled_at'] != null ? String(raw['scheduled_at']) : null,
      createdAt:      String(raw['created_at'] ?? ''),
    })
  }

  /**
   * هل ما زالت الحملة قيد تجهيز قائمة المستلمين؟
   * totalCount is not final yet — poll getCampaign() or wait for the
   * campaign.created webhook.
   */
  isPreparing(): boolean {
    return this.status === 'preparing'
  }

  /** فشل التجهيز — لن تُرسل الحملة. See failureReason. */
  isFailed(): boolean {
    return this.status === 'failed'
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
      campaignId:     this.campaignId,
      name:           this.name,
      status:         this.status,
      messageType:    this.messageType,
      requestedCount: this.requestedCount,
      totalCount:     this.totalCount,
      failureReason:  this.failureReason,
      sentCount:      this.sentCount,
      deliveredCount: this.deliveredCount,
      readCount:      this.readCount,
      failedCount:    this.failedCount,
      scheduledAt:    this.scheduledAt,
      createdAt:      this.createdAt,
    }
  }
}
