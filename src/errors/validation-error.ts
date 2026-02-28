import { CubeConnectError } from './cube-connect-error.js'

/**
 * خطأ التحقق (422)
 * يطابق ValidationException في PHP SDK
 */
export class ValidationError extends CubeConnectError {
  /** أخطاء الحقول — مثل { phone: ['The phone field is required.'] } */
  public readonly errors: Record<string, string[]>

  constructor(message: string, errorCode: string, errors: Record<string, string[]> = {}) {
    super(message, 422, errorCode || 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.errors = errors
  }

  /** إنشاء خطأ تحقق مع تفاصيل الحقول */
  static withErrors(errorCode: string, message: string, errors?: Record<string, string[]>): ValidationError {
    return new ValidationError(message, errorCode, errors)
  }
}
