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

### Scheduled Message

Pass a `scheduledAt` (ISO 8601) and `timezone` (IANA) to schedule a message for future delivery:

```typescript
const response = await cube.sendText(
  '+966501234567',
  'Your appointment is tomorrow at 10:00 AM.',
  {
    scheduledAt: '2026-05-01T10:00:00',
    timezone: 'Asia/Riyadh',
  },
)

response.status        // "scheduled"
response.messageLogId  // 4521
response.scheduledAt   // "2026-05-01T07:00:00Z" (UTC)
```

Templates can also be scheduled:

```typescript
const response = await cube.sendTemplate(
  '+966501234567',
  'appointment_reminder',
  ['Dr. Ahmed', '10:00 AM'],
  'ar',
  {
    scheduledAt: '2026-05-01T09:00:00',
    timezone: 'Asia/Riyadh',
  },
)
```

### Bulk Campaigns

Send a message to a large list of recipients in a single API call:

```typescript
const campaign = await cube.createCampaign({
  whatsappAccountId: 'YOUR_ACCOUNT_ID',   // Dashboard → WhatsApp Numbers → copy icon next to "API ID:"
  messageType: 'text',
  body: 'Your exclusive offer expires tomorrow!',
  recipients: [
    { phone: '+966501234567', name: 'Ahmed' },
    { phone: '+966509876543', name: 'Sara' },
  ],
  campaignName: 'Offer Reminder',
  scheduledAt: '2026-05-01T09:00:00',     // optional
  timezone: 'Asia/Riyadh',               // required when scheduledAt is set
})

campaign.campaignId  // "01JX..."
campaign.status      // "pending"
campaign.totalCount  // 2
campaign.isScheduled()  // true
```

#### Get Campaign Status

```typescript
const campaign = await cube.getCampaign(campaignId)

campaign.status       // "processing", "completed", "cancelled", "failed"
campaign.totalCount   // 500
campaign.sentCount    // 320
campaign.failedCount  // 12
campaign.scheduledAt  // "2026-05-01T06:00:00Z"
campaign.isCompleted() // true
```

#### Cancel a Scheduled Campaign

```typescript
const result = await cube.cancelCampaign(campaignId)
result.success  // true
```

### Health Check

```typescript
const health = await cube.health()
// { status: 'healthy', checks: { app: true, database: true, cache: true }, timestamp: '...' }
```

## Webhooks

Receive real-time notifications from CubeConnect for messages, campaigns, templates, chatbot flows, and quality events.

### Verifying Webhook Signatures

```typescript
import { verifyWebhookSignature } from '@cubesoftware/cube-connect-sdk-js'

app.post('/cubeconnect/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = verifyWebhookSignature({
    payload: req.body.toString(),
    signature: req.headers['x-webhook-signature'] as string,
    timestamp: req.headers['x-webhook-timestamp'] as string,
    secret: process.env.CUBECONNECT_WEBHOOK_SECRET!,
  })

  if (!isValid) {
    return res.status(401).send('Invalid signature')
  }

  // Process webhook...
  res.sendStatus(200)
})
```

### Handling Webhook Events

Use the `WebhookEvent` class for clean event handling:

```typescript
import { WebhookEvent, verifyWebhookSignature } from '@cubesoftware/cube-connect-sdk-js'

app.post('/cubeconnect/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const body = req.body.toString()

  const isValid = verifyWebhookSignature({
    payload: body,
    signature: req.headers['x-webhook-signature'] as string,
    timestamp: req.headers['x-webhook-timestamp'] as string,
    secret: process.env.CUBECONNECT_WEBHOOK_SECRET!,
  })

  if (!isValid) return res.status(401).send('Invalid signature')

  const event = new WebhookEvent(JSON.parse(body))

  if (event.isMessageReceived()) {
    console.log(`New message from ${event.get('from')}: ${event.get('content')}`)
  }

  if (event.isMessageStatusUpdated()) {
    console.log(`Message ${event.get('message_id')} is now ${event.get('status')}`)
  }

  if (event.isCampaignCompleted()) {
    console.log(`Campaign "${event.get('name')}": ${event.get('sent_count')} sent, ${event.get('failed_count')} failed`)
  }

  if (event.isTemplateStatusChanged()) {
    console.log(`Template "${event.get('template_name')}" is now ${event.get('status')}`)
  }

  if (event.isFlowSessionCompleted()) {
    console.log(`Flow completed for ${event.get('customer_phone')}`)
  }

  if (event.isQualityEvent()) {
    console.warn(`Quality ${event.get('type')} from ${event.get('user_phone')}`)
  }

  res.sendStatus(200)
})
```

### Supported Events

| Event | Method | Description |
|-------|--------|-------------|
| `message.status_updated` | `isMessageStatusUpdated()` | Message status change (sent, delivered, read, failed) |
| `message.received` | `isMessageReceived()` | Incoming message from a customer |
| `campaign.created` | `isCampaignCreated()` | New campaign created |
| `campaign.started` | `isCampaignStarted()` | Campaign execution started |
| `campaign.completed` | `isCampaignCompleted()` | Campaign finished |
| `template.submitted` | `isTemplateSubmitted()` | Template submitted to Meta |
| `template.status_changed` | `isTemplateStatusChanged()` | Template approved, rejected, or paused |
| `flow.session_started` | `isFlowSessionStarted()` | Chatbot flow session started |
| `flow.session_completed` | `isFlowSessionCompleted()` | Chatbot flow session completed |
| `flow.session_cancelled` | `isFlowSessionCancelled()` | Session cancelled by customer |
| `account.quality_event` | `isQualityEvent()` | Quality event (block or report) |
| `webhook.test` | `isTest()` | Connection test ping |

### WebhookEvent Helpers

```typescript
event.event      // "message.received"
event.tenantId   // 1
event.timestamp  // "2026-03-10T14:30:00+03:00"
event.category() // "message"
event.is('message.received') // true
event.isTest()   // false
event.toObject() // Full payload object
```

### TypeScript Types

```typescript
import type { WebhookEventType, WebhookPayload, VerifyOptions } from '@cubesoftware/cube-connect-sdk-js'
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

## Response Objects

### MessageResponse

Returned by `sendText()` and `sendTemplate()`:

| Property | Type | Description |
|----------|------|-------------|
| `status` | `string` | `queued` for immediate delivery, `scheduled` for future delivery |
| `messageLogId` | `number` | Unique tracking ID |
| `conversationCategory` | `string` | `SERVICE`, `MARKETING`, `UTILITY`, or `AUTHENTICATION` |
| `cost` | `number` | Message cost |
| `scheduledAt` | `string \| null` | UTC datetime if scheduled, otherwise `null` |

```typescript
response.queued()      // true if status is "queued"
response.scheduled()   // true if status is "scheduled"
response.toArray()     // Plain object representation
```

### CampaignResponse

Returned by `createCampaign()` and `getCampaign()`:

| Property | Type | Description |
|----------|------|-------------|
| `campaignId` | `string` | Unique campaign ULID |
| `name` | `string \| null` | Campaign name |
| `status` | `string` | `pending`, `processing`, `completed`, `cancelled`, `failed` |
| `messageType` | `string` | `text` or `template` |
| `totalCount` | `number` | Total recipients |
| `sentCount` | `number` | Successfully sent |
| `failedCount` | `number` | Failed deliveries |
| `scheduledAt` | `string \| null` | Scheduled UTC datetime |
| `createdAt` | `string` | Creation timestamp |

```typescript
campaign.isScheduled()  // true if pending with a scheduledAt
campaign.isCompleted()  // true if status is "completed"
campaign.isCancelled()  // true if status is "cancelled"
campaign.toObject()     // Plain object representation
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
import type {
  CubeConnectOptions,
  HealthResponse,
  MessageResponseData,
  SendOptions,
  CreateCampaignPayload,
  CampaignRecipient,
  CampaignResponseData,
} from '@cubesoftware/cube-connect-sdk-js'

import { CampaignResponse } from '@cubesoftware/cube-connect-sdk-js'
```

## Requirements

- Node.js 18+ or modern browser with `fetch` support
- ES modules support

## Documentation

Full API documentation is available at [docs.cubeconnect.io](https://docs.cubeconnect.io).

## License

CubeConnect for JavaScript is open-sourced software licensed under the [MIT license](LICENSE).

Copyright (c) 2026 [Cube Software](https://cubesoftware.io) (CubeSoftLabs). All rights reserved.
