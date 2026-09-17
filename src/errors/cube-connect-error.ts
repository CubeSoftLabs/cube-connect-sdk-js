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

  /**
   * صنّف فشل النقل: مهلة منتهية أم تعذّر الاتصال.
   *
   * A timeout raised by fetchWithTimeout is already a CubeConnectError and is
   * passed through untouched — the old catch blocks re-wrapped it as
   * "Unable to connect", which read like an outage and invited an unsafe retry.
   */
  static fromTransportFailure(error: unknown): CubeConnectError {
    if (error instanceof CubeConnectError) return error

    return CubeConnectError.connectionFailed(error instanceof Error ? error : undefined)
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
