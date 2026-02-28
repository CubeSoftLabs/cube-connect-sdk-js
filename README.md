# CubeConnect for JavaScript/TypeScript

<p>
<a href="https://www.npmjs.com/package/@cubesoftware/cube-connect-sdk-js"><img src="https://img.shields.io/npm/v/@cubesoftware/cube-connect-sdk-js.svg" alt="Latest Version"></a>
<a href="https://www.npmjs.com/package/@cubesoftware/cube-connect-sdk-js"><img src="https://img.shields.io/npm/l/@cubesoftware/cube-connect-sdk-js.svg" alt="License"></a>
<a href="https://www.npmjs.com/package/@cubesoftware/cube-connect-sdk-js"><img src="https://img.shields.io/node/v/@cubesoftware/cube-connect-sdk-js.svg" alt="Node Version"></a>
</p>

Official JavaScript/TypeScript SDK for the [CubeConnect](https://cubeconnect.io) WhatsApp Business Platform.

## Installation

```bash
npm install @cubesoftware/cube-connect-sdk-js
```

Zero runtime dependencies. Works in Node.js 18+ and modern browsers.

## Quick Start

```typescript
import { CubeConnect } from '@cubesoftware/cube-connect-sdk-js'

const cube = new CubeConnect({ apiKey: 'YOUR_API_KEY' })

const response = await cube.sendText('+966501234567', 'Hello from JavaScript!')
console.log(response.status)       // "queued"
console.log(response.messageLogId) // 4521
```

## Usage

### Sending a Text Message

```typescript
import { CubeConnect } from '@cubesoftware/cube-connect-sdk-js'

const cube = new CubeConnect({ apiKey: 'YOUR_API_KEY' })

const response = await cube.sendText('+966501234567', 'Your order has been confirmed.')

response.status               // "queued"
response.messageLogId         // 4521
response.conversationCategory // "SERVICE"
response.queued()             // true
```

> **Note:** Text messages require the recipient to have messaged you within the last 24 hours. Outside this window, use a [template message](#sending-a-template-message).

### Sending a Template Message

```typescript
const response = await cube.sendTemplate(
  '+966501234567',
  'order_confirmation',
  ['ORD-1234', '500 SAR'],
)

// With explicit language code (default: en_US)
const response = await cube.sendTemplate(
  '+966501234567',
  'order_confirmation',
  ['ORD-1234', '500 SAR'],
  'ar',
)
```

Parameters map to `{{1}}`, `{{2}}`, etc. in the template body. The SDK automatically converts them to the Meta components format. Templates can be sent at any time.

### Template Without Parameters

```typescript
const response = await cube.sendTemplate('+966501234567', 'welcome_message')
```

### Health Check

```typescript
const health = await cube.health()
// { status: 'healthy', checks: { app: true, database: true, cache: true }, timestamp: '...' }
```

## Configuration Options

```typescript
const cube = new CubeConnect({
  apiKey: 'YOUR_API_KEY',                    // Required
  baseUrl: 'https://cubeconnect.io',         // Default
  tenantId: 'tenant_123',                    // Optional (multi-tenant)
  timeout: 30000,                            // Default: 30000ms
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Your API key from the dashboard |
| `baseUrl` | `string` | `https://cubeconnect.io` | API base URL |
| `tenantId` | `string` | `undefined` | Tenant ID (multi-tenant only) |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

## Response Object

All message methods return a `MessageResponse` with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `status` | `string` | `queued` on success |
| `messageLogId` | `number` | Unique tracking ID |
| `conversationCategory` | `string` | `SERVICE`, `MARKETING`, `UTILITY`, or `AUTHENTICATION` |
| `cost` | `number` | Message cost |

```typescript
response.queued()   // true if status is "queued"
response.toArray()  // Plain object representation
```

## Error Handling

The SDK throws specific errors for each error type. All errors include `errorCode` and `statusCode` properties matching the [unified API error codes](https://docs.cubeconnect.io/api/errors):

```typescript
import {
  CubeConnect,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  CubeConnectError,
} from '@cubesoftware/cube-connect-sdk-js'

const cube = new CubeConnect({ apiKey: 'YOUR_API_KEY' })

try {
  await cube.sendText('+966501234567', 'Hello!')
} catch (e) {
  if (e instanceof AuthenticationError) {
    // 401 — Invalid or missing API key
    // 403 — Insufficient permissions or tenant issues
    console.log(e.errorCode)  // "INVALID_API_KEY", "AUTHENTICATION_REQUIRED",
                               // "API_KEY_NO_TENANT", "TENANT_NOT_FOUND", "FORBIDDEN"
    console.log(e.statusCode) // 401 or 403
  } else if (e instanceof ValidationError) {
    // 422 — Invalid request data
    console.log(e.errorCode) // "VALIDATION_ERROR", "NO_ACTIVE_ACCOUNT",
                              // "MISSING_ACCESS_TOKEN", "INVALID_PHONE_NUMBER"
    console.log(e.errors)    // { phone: ['The phone field is required.'] }
  } else if (e instanceof NotFoundError) {
    // 404 — Resource not found
    console.log(e.errorCode) // "NOT_FOUND", "TEMPLATE_NOT_FOUND"
  } else if (e instanceof RateLimitError) {
    // 429 — Rate limit or plan limit exceeded
    console.log(e.errorCode) // "RATE_LIMIT_EXCEEDED", "PLAN_LIMIT_REACHED",
                              // "SUBSCRIPTION_EXPIRED"
  } else if (e instanceof CubeConnectError) {
    // 5xx or network errors
    console.log(e.errorCode)  // "INTERNAL_ERROR", "MESSAGE_SEND_FAILED", "CONNECTION_FAILED"
    console.log(e.statusCode)
  }
}
```

All errors extend `CubeConnectError`, so you can catch the base class for generic handling.

## TypeScript

Full type definitions are included. Import types directly:

```typescript
import type { CubeConnectOptions, HealthResponse, MessageResponseData } from '@cubesoftware/cube-connect-sdk-js'
```

## Requirements

- Node.js 18+ or modern browser with `fetch` support
- ES modules support

## Documentation

Full API documentation is available at [docs.cubeconnect.io](https://docs.cubeconnect.io).

## License

CubeConnect for JavaScript is open-sourced software licensed under the [MIT license](LICENSE).

Copyright (c) 2026 [Cube Software](https://cubesoftware.io) (CubeSoftLabs). All rights reserved.
