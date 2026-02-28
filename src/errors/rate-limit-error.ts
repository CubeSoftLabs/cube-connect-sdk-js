import { CubeConnectError } from './cube-connect-error.js'

/**
 * خطأ تجاوز الحد (429)
 * يطابق RateLimitException في PHP SDK
 */
export class RateLimitError extends CubeConnectError {
  constructor(message: string, errorCode: string) {
    super(message, 429, errorCode || 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }

  /** تم تجاوز حد الطلبات أو حد الباقة */
  static exceeded(errorCode?: string, message?: string): RateLimitError {
    return new RateLimitError(
      message || 'Rate limit exceeded for your current plan.',
      errorCode || 'RATE_LIMIT_EXCEEDED',
    )
  }
}
