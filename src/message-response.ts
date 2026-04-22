import type { MessageResponseData } from './types.js'

/**
 * كائن استجابة الرسالة
 * يطابق DTOs\MessageResponse في PHP SDK
 */
export class MessageResponse {
  public readonly status: string
  public readonly messageLogId: string
  public readonly conversationCategory: string
  public readonly cost: number

  constructor(data: MessageResponseData) {
    this.status = data.status ?? ''
    this.messageLogId = data.message_log_id ?? ''
    this.conversationCategory = data.conversation_category ?? ''
    this.cost = data.cost ?? 0
  }

  /** هل الرسالة في قائمة الانتظار؟ */
  queued(): boolean {
    return this.status === 'queued'
  }

  /** تحويل إلى كائن عادي */
  toArray(): MessageResponseData {
    return {
      status: this.status,
      message_log_id: this.messageLogId,
      conversation_category: this.conversationCategory,
      cost: this.cost,
    }
  }
}
