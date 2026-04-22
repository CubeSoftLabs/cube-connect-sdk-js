import type { MessageStatusResponseData } from './types.js'

/**
 * استجابة حالة رسالة واحدة من API
 */
export class MessageStatusResponse {
  readonly messageLogId: string
  readonly status: string
  readonly toPhone: string
  readonly messageType: string
  readonly metaMessageId: string | null
  readonly sentAt: string | null
  readonly scheduledAt: string | null
  readonly costAmount: number
  readonly costCurrency: string
  readonly errorMessage: string | null
  readonly createdAt: string

  constructor(data: MessageStatusResponseData) {
    this.messageLogId  = data.messageLogId
    this.status        = data.status
    this.toPhone       = data.toPhone
    this.messageType   = data.messageType
    this.metaMessageId = data.metaMessageId
    this.sentAt        = data.sentAt
    this.scheduledAt   = data.scheduledAt
    this.costAmount    = data.costAmount
    this.costCurrency  = data.costCurrency
    this.errorMessage  = data.errorMessage
    this.createdAt     = data.createdAt
  }

  static fromResponse(data: Record<string, unknown>): MessageStatusResponse {
    return new MessageStatusResponse({
      messageLogId:  String(data['message_log_id'] ?? ''),
      status:        String(data['status'] ?? ''),
      toPhone:       String(data['to_phone'] ?? ''),
      messageType:   String(data['message_type'] ?? ''),
      metaMessageId: data['meta_message_id'] != null ? String(data['meta_message_id']) : null,
      sentAt:        data['sent_at'] != null ? String(data['sent_at']) : null,
      scheduledAt:   data['scheduled_at'] != null ? String(data['scheduled_at']) : null,
      costAmount:    Number(data['cost_amount'] ?? 0),
      costCurrency:  String(data['cost_currency'] ?? ''),
      errorMessage:  data['error_message'] != null ? String(data['error_message']) : null,
      createdAt:     String(data['created_at'] ?? ''),
    })
  }

  isSent():      boolean { return this.status === 'sent' }
  isDelivered(): boolean { return this.status === 'delivered' }
  isRead():      boolean { return this.status === 'read' }
  isFailed():    boolean { return this.status === 'failed' }
  isScheduled(): boolean { return this.status === 'scheduled' }

  toObject(): MessageStatusResponseData {
    return {
      messageLogId:  this.messageLogId,
      status:        this.status,
      toPhone:       this.toPhone,
      messageType:   this.messageType,
      metaMessageId: this.metaMessageId,
      sentAt:        this.sentAt,
      scheduledAt:   this.scheduledAt,
      costAmount:    this.costAmount,
      costCurrency:  this.costCurrency,
      errorMessage:  this.errorMessage,
      createdAt:     this.createdAt,
    }
  }
}
