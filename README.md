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

## Usage

### sendTemplate()

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone` | string | Yes | Recipient phone number with country code |
| `name` | string | Yes | Template name (e.g., `order_confirmation`) |
| `languageCode` | string | Yes | Language code matching the approved template (e.g., `ar`, `en_US`) |
| `params` | string[] | No | Parameters mapping to `{{1}}`, `{{2}}`, etc. |
| `options.scheduledAt` | string | No | ISO 8601 datetime for scheduled delivery |
| `options.timezone` | string | No | IANA timezone. Required when `scheduledAt` is set |
| `options.whatsappAccountId` | string | No | Override the default WhatsApp account (useful with multiple numbers) |

```typescript
const response = await cube.sendTemplate(
  '+966501234567',         // phone
  'order_confirmation',    // name
  'ar',                    // languageCode
  ['ORD-1234', '500 SAR'], // params → {{1}}, {{2}}
)

response.status               // "queued"
response.messageLogId         // 4521
response.conversationCategory // "UTILITY"
response.queued()             // true
```

Without parameters:

```typescript
const response = await cube.sendTemplate('+966501234567', 'welcome_message', 'ar')
```

Scheduled delivery:

```typescript
const response = await cube.sendTemplate(
  '+966501234567',
  'appointment_reminder',
  'ar',                        // languageCode
  ['Dr. Ahmed', '10:00 AM'],   // params
  {
    scheduledAt: '2026-05-01T09:00:00', // ISO 8601
    timezone: 'Asia/Riyadh',            // IANA timezone
  },
)

response.status      // "scheduled"
response.scheduledAt // "2026-05-01T06:00:00Z" (UTC)
```

### Bulk Campaigns

Send a pre-approved template to a large list in a single API call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageType` | string | Yes | Must be `template` |
| `templateName` | string | Yes | Template name (same as `name` in `sendTemplate()`) |
| `templateLanguage` | string | Yes | Language code (same as `languageCode` in `sendTemplate()`) |
| `recipients` | array | Yes | List of recipients. Max 50,000 |
| `recipients[].phone` | string | Yes | Recipient phone number |
| `recipients[].name` | string | No | Recipient display name |
| `recipients[].variables` | object | No | Per-recipient variables (e.g., `{ '1': 'Ahmed', '2': 'ORD-1234' }`) |
| `campaignName` | string | No | Human-readable campaign name |
| `scheduledAt` | string | No | ISO 8601 datetime for scheduled delivery |
| `timezone` | string | No | IANA timezone. Required when `scheduledAt` is set |
| `whatsappAccountId` | string | No | Override the default WhatsApp account |

```typescript
const campaign = await cube.createCampaign({
  messageType: 'template',
  templateName: 'order_confirmation',
  templateLanguage: 'ar',
  recipients: [
    { phone: '+966501234567', name: 'Ahmed', variables: { '1': 'Ahmed', '2': 'ORD-1234' } },
    { phone: '+966509876543', name: 'Sara',  variables: { '1': 'Sara',  '2': 'ORD-5678' } },
  ],
  campaignName: 'Order Notifications',
})

campaign.campaignId // "01JX..."
campaign.status     // "pending"
campaign.totalCount // 2
```

Scheduled delivery:

```typescript
const campaign = await cube.createCampaign({
  messageType: 'template',
  templateName: 'offer_reminder',
  templateLanguage: 'ar',
  recipients: [...],
  campaignName: 'Flash Sale',
  scheduledAt: '2026-05-01T09:00:00', // ISO 8601
  timezone: 'Asia/Riyadh',            // IANA timezone
})

campaign.status        // "pending"
campaign.isScheduled() // true
```

#### Get Campaign Status

```typescript
const campaign = await cube.getCampaign(campaignId)

campaign.status        // "processing", "completed", "cancelled", "failed"
campaign.totalCount    // 500
campaign.sentCount     // 320
campaign.failedCount   // 12
campaign.isCompleted() // true
```

#### Cancel a Scheduled Campaign

```typescript
const result = await cube.cancelCampaign(campaignId)
result.success  // true
```

### List Templates

```typescript
const templates = await cube.getTemplates({ status: 'APPROVED' })

templates.forEach(t => {
  t.name        // "order_confirmation"
  t.paramsCount // 3
  t.body        // "Hello {{1}}, your order {{2}} has been shipped."
  t.header      // null
})
```

### Health Check

```typescript
const health = await cube.health()
// { status: 'healthy', checks: { app: true, database: true, cache: true }, timestamp: '...' }
```

## Webhooks

Receive real-time notifications from CubeConnect for messages, campaigns, templates, chatbot flows, and quality events.

### Signature Verification

```typescript
import { verifyWebhookSignature } from '@cubesoftware/cube-connect-sdk-js'

app.post('/cubeconnect/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = verifyWebhookSignature({
    payload:   req.body.toString(),
    signature: req.headers['x-webhook-signature'] as string,
    timestamp: req.headers['x-webhook-timestamp'] as string,
    secret:    process.env.CUBECONNECT_WEBHOOK_SECRET!,
  })

  if (!isValid) return res.status(401).send('Invalid signature')

  const event = new WebhookEvent(JSON.parse(req.body.toString()))

  if (event.isMessageReceived()) {
    console.log(`New message from ${event.get('from')}: ${event.get('content')}`)
  }

  if (event.isCampaignCompleted()) {
    console.log(`Campaign "${event.get('name')}": ${event.get('sent_count')} sent`)
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

## Configuration Options

```typescript
const cube = new CubeConnect({
  apiKey: process.env.CUBECONNECT_API_KEY,                        // Required — Settings → API
  whatsappAccountId: process.env.CUBECONNECT_WHATSAPP_ACCOUNT_ID, // Required — Dashboard → WhatsApp Numbers → API ID:
  baseUrl: 'https://cubeconnect.io',                              // Default
  timeout: 30000,                                                  // Default: 30000ms
})
```

## Response Objects

### MessageResponse

Returned by `sendTemplate()`:

| Property | Type | Description |
|----------|------|-------------|
| `status` | `string` | `queued` for immediate delivery, `scheduled` for future delivery |
| `messageLogId` | `number` | Unique tracking ID |
| `conversationCategory` | `string` | `MARKETING`, `UTILITY`, or `AUTHENTICATION` |
| `cost` | `number` | Message cost |
| `scheduledAt` | `string \| null` | UTC datetime if scheduled, otherwise `null` |

```typescript
response.queued()    // true if status is "queued"
response.scheduled() // true if status is "scheduled"
response.toObject()  // Plain object representation
```

### CampaignResponse

Returned by `createCampaign()` and `getCampaign()`:

| Property | Type | Description |
|----------|------|-------------|
| `campaignId` | `string` | Unique campaign ULID |
| `name` | `string \| null` | Campaign name |
| `status` | `string` | `pending`, `processing`, `completed`, `cancelled`, `failed` |
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

```typescript
import {
  CubeConnect,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  CubeConnectError,
} from '@cubesoftware/cube-connect-sdk-js'

try {
  await cube.sendTemplate('+966501234567', 'order_confirmation', ['ORD-1234'])
} catch (e) {
  if (e instanceof AuthenticationError) {
    // 401/403 — Invalid API key or permissions
    e.errorCode  // "INVALID_API_KEY", "FORBIDDEN", ...
    e.statusCode // 401 or 403
  } else if (e instanceof ValidationError) {
    // 422 — Invalid request data
    e.errorCode // "VALIDATION_ERROR", "INVALID_PHONE_NUMBER", ...
    e.errors    // { phone: ['The phone field is required.'] }
  } else if (e instanceof NotFoundError) {
    // 404 — Resource not found
    e.errorCode // "NOT_FOUND", "TEMPLATE_NOT_FOUND"
  } else if (e instanceof RateLimitError) {
    // 429 — Rate or plan limit exceeded
    e.errorCode // "RATE_LIMIT_EXCEEDED", "PLAN_LIMIT_REACHED", ...
  } else if (e instanceof CubeConnectError) {
    // 5xx or network errors
    e.errorCode  // "INTERNAL_ERROR", "MESSAGE_SEND_FAILED", ...
    e.statusCode
  }
}
```

## TypeScript

```typescript
import type {
  CubeConnectOptions,
  HealthResponse,
  MessageResponseData,
  SendOptions,
  CreateCampaignPayload,
  CampaignRecipient,
  CampaignResponseData,
  TemplateData,
} from '@cubesoftware/cube-connect-sdk-js'

import { CampaignResponse, MessageStatusResponse } from '@cubesoftware/cube-connect-sdk-js'
```

## Documentation

Full API documentation is available at [docs.cubeconnect.io](https://docs.cubeconnect.io).

## License

CubeConnect for JavaScript is open-sourced software licensed under the [MIT license](LICENSE).

Copyright (c) 2026 [Cube Software](https://cubesoftware.io) (CubeSoftLabs). All rights reserved.
