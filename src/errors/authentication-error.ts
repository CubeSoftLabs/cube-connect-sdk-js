import { CubeConnectError } from './cube-connect-error.js'

/**
 * خطأ المصادقة (401/403)
 * يطابق AuthenticationException في PHP SDK
 */
export class AuthenticationError extends CubeConnectError {
  constructor(message: string, statusCode: number, errorCode: string) {
    super(message, statusCode, errorCode)
    this.name = 'AuthenticationError'
  }

  /** مفتاح API غير صالح (401) */
  static invalidKey(errorCode?: string, message?: string): AuthenticationError {
    return new AuthenticationError(
      message || 'The provided API key is invalid.',
      401,
      errorCode || 'INVALID_API_KEY',
    )
  }

  /** مفتاح API مفقود (401) */
  static missingKey(): AuthenticationError {
    return new AuthenticationError(
      'An API key is required. Provide it via the apiKey option.',
      401,
      'AUTHENTICATION_REQUIRED',
    )
  }

  /** صلاحيات غير كافية (403) */
  static forbidden(errorCode?: string, message?: string): AuthenticationError {
    return new AuthenticationError(
      message || 'The API key does not have access to this resource.',
      403,
      errorCode || 'FORBIDDEN',
    )
  }
}
