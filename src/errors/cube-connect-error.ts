/**
 * الخطأ الأساسي لـ CubeConnect SDK
 * يطابق CubeConnectException في PHP SDK
 */
export class CubeConnectError extends Error {
  /** كود HTTP */
  public readonly statusCode: number
  /** كود الخطأ من API (مثل INTERNAL_ERROR) */
  public readonly errorCode: string

  constructor(message: string, statusCode: number = 0, errorCode: string = '') {
    super(message)
    this.name = 'CubeConnectError'
    this.statusCode = statusCode
    this.errorCode = errorCode
  }

  /** خطأ من الخادم (5xx) */
  static serverError(statusCode: number, errorCode?: string, message?: string): CubeConnectError {
    return new CubeConnectError(
      message || `CubeConnect API returned an unexpected response [${statusCode}].`,
      statusCode,
      errorCode || 'SERVER_ERROR',
    )
  }

  /** فشل الاتصال بالخادم */
  static connectionFailed(cause?: Error): CubeConnectError {
    const err = new CubeConnectError(
      'Unable to connect to CubeConnect API.',
      0,
      'CONNECTION_FAILED',
    )
    if (cause) err.cause = cause
    return err
  }
}
