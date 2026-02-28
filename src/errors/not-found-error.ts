import { CubeConnectError } from './cube-connect-error.js'

/**
 * خطأ عدم العثور (404)
 * يطابق NotFoundException في PHP SDK
 */
export class NotFoundError extends CubeConnectError {
  constructor(message: string, errorCode: string) {
    super(message, 404, errorCode || 'NOT_FOUND')
    this.name = 'NotFoundError'
  }

  /** المورد المطلوب غير موجود */
  static resource(errorCode?: string, message?: string): NotFoundError {
    return new NotFoundError(
      message || 'The requested resource was not found.',
      errorCode || 'NOT_FOUND',
    )
  }
}
