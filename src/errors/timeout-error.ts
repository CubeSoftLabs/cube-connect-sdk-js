import { CubeConnectError } from './cube-connect-error.js'

/**
 * انتهت مهلة الطلب قبل وصول الرد.
 *
 * Deliberately distinct from CONNECTION_FAILED: the server may well have
 * accepted the work. Treating a timeout as "it failed" and re-sending is how
 * duplicate campaigns get created — retry with the same Idempotency-Key, which
 * returns the original result instead of creating a second one.
 */
export class TimeoutError extends CubeConnectError {
  constructor(timeoutMs: number, cause?: Error) {
    super(
      `The CubeConnect API request timed out after ${timeoutMs}ms. The operation may still have `
        + 'completed — retry with the same Idempotency-Key, or check the resource status before re-sending.',
      0,
      'REQUEST_TIMEOUT',
    )
    this.name = 'TimeoutError'
    if (cause) this.cause = cause
  }
}
