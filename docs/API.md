# RealTimeX CRM API Documentation

## Overview

The RealTimeX CRM API allows you to programmatically manage contacts, companies, deals, and activities. This REST API uses API keys for authentication and supports webhooks for event notifications.

**Base URL**: `https://your-project.supabase.co/functions/v1`

## Authentication

All API requests must include an API key in the `Authorization` header using the Bearer scheme:

```http
Authorization: Bearer ak_live_your_api_key_here
```

### Creating an API Key

1. Navigate to **Integrations** in the RealTimeX CRM dashboard
2. Click **Create API Key**
3. Enter a name and select the required scopes
4. Copy the generated key (it will only be shown once)

### API Key Scopes

- `contacts:read` - Read contact information
- `contacts:write` - Create, update, and delete contacts
- `companies:read` - Read company information
- `companies:write` - Create, update, and delete companies
- `deals:read` - Read deal information
- `deals:write` - Create, update, and delete deals
- `tasks:read` - Read task information
- `tasks:write` - Create, update, and delete tasks
- `activities:write` - Create notes (contact, company, deal, task notes)
- `*` - Wildcard access to all resources (use with caution)

## Rate Limits

- **100 requests per minute** per API key
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the limit resets

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header.

## Endpoints

### Contacts

#### GET /api-v1-contacts

List or search contacts.

**Required scope**: `contacts:read`

**Parameters**:
- `email` (query, optional): Search for contacts matching this email address.

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      ...
    }
  ]
}
```

#### GET /api-v1-contacts/{id}

Get a single contact by ID.

**Required scope**: `contacts:read`

**Parameters**:
- `id` (path, required): Contact ID

**Response**:
```json
{
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": [{"email": "john@example.com", "type": "Work"}],
    "phone_number": [{"number": "+1234567890", "type": "Mobile"}],
    "company_id": 5,
    "sales_id": 2,
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

#### POST /api-v1-contacts

Create a new contact.

**Required scope**: `contacts:write`

**Request body**:
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": [{"email": "jane@example.com", "type": "Work"}],
  "phone_number": [{"number": "+1987654321", "type": "Mobile"}],
  "company_id": 5
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    ...
  }
}
```

#### PATCH /api-v1-contacts/{id}

Update an existing contact.

**Required scope**: `contacts:write`

**Parameters**:
- `id` (path, required): Contact ID

**Request body**:
```json
{
  "first_name": "Jane Updated",
  "email": [{"email": "jane.new@example.com", "type": "Work"}]
}
```

**Response**:
```json
{
  "data": {
    "id": 2,
    "first_name": "Jane Updated",
    ...
  }
}
```

#### DELETE /api-v1-contacts/{id}

Delete a contact.

**Required scope**: `contacts:write`

**Parameters**:
- `id` (path, required): Contact ID

**Response** (204 No Content)

---

### Companies

#### GET /api-v1-companies

List or search companies.

**Required scope**: `companies:read`

**Parameters**:
- `name` (query, optional): Search for companies with a name matching this string (partial, case-insensitive).
- `website` (query, optional): Search for companies matching this website/domain.
- `domain` (query, optional): Alias for `website`.

**Response**:
```json
{
  "data": [
    {
      "id": 5,
      "name": "Acme Corp",
      ...
    }
  ]
}
```

#### GET /api-v1-companies/{id}

Get a single company by ID.

**Required scope**: `companies:read`

**Response**:
```json
{
  "data": {
    "id": 5,
    "name": "Acme Corp",
    "sector": "Technology",
    "size": 100,
    "website": "https://acme.com",
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

#### POST /api-v1-companies

Create a new company.

**Required scope**: `companies:write`

**Request body**:
```json
{
  "name": "Tech Startup Inc",
  "sector": "Technology",
  "size": 50,
  "website": "https://techstartup.com"
}
```

#### PATCH /api-v1-companies/{id}

Update a company.

**Required scope**: `companies:write`

#### DELETE /api-v1-companies/{id}

Delete a company.

**Required scope**: `companies:write`

---

### Deals

#### GET /api-v1-deals/{id}

Get a single deal by ID.

**Required scope**: `deals:read`

**Response**:
```json
{
  "data": {
    "id": 10,
    "name": "Enterprise License",
    "amount": 50000,
    "stage": "proposal",
    "company_id": 5,
    "contact_ids": [1, 2],
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

#### POST /api-v1-deals

Create a new deal.

**Required scope**: `deals:write`

**Request body**:
```json
{
  "name": "Premium Package",
  "amount": 25000,
  "stage": "discovery",
  "company_id": 5,
  "contact_ids": [1]
}
```

#### PATCH /api-v1-deals/{id}

Update a deal.

**Required scope**: `deals:write`

**Request body**:
```json
{
  "stage": "won",
  "amount": 30000
}
```

#### DELETE /api-v1-deals/{id}

Delete a deal.

**Required scope**: `deals:write`

---

### Tasks

#### GET /api-v1-tasks

List or search tasks.

**Required scope**: `tasks:read`

**Parameters**:
- `contact_id` (query, optional): Filter tasks by contact ID
- `company_id` (query, optional): Filter tasks by company ID
- `deal_id` (query, optional): Filter tasks by deal ID
- `status` (query, optional): Filter tasks by status (todo, in_progress, blocked, done, cancelled)

**Response**:
```json
{
  "data": [
    {
      "id": 42,
      "text": "Send proposal document",
      "type": "Email",
      "contact_id": 1,
      "due_date": "2025-12-30",
      "status": "todo",
      "priority": "high",
      ...
    }
  ]
}
```

#### GET /api-v1-tasks/{id}

Get a single task by ID.

**Required scope**: `tasks:read`

**Parameters**:
- `id` (path, required): Task ID

**Response**:
```json
{
  "data": {
    "id": 42,
    "text": "Send proposal document",
    "type": "Email",
    "contact_id": 1,
    "company_id": 5,
    "deal_id": 10,
    "due_date": "2025-12-30",
    "status": "todo",
    "priority": "high",
    "sales_id": 2,
    "created_at": "2025-12-26T10:00:00Z"
  }
}
```

#### POST /api-v1-tasks

Create a new task.

**Required scope**: `tasks:write`

**Request body**:
```json
{
  "text": "Follow up on proposal",
  "type": "Call",
  "contact_id": 1,
  "due_date": "2025-12-30",
  "priority": "high",
  "status": "todo"
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": 43,
    "text": "Follow up on proposal",
    "type": "Call",
    "contact_id": 1,
    "due_date": "2025-12-30",
    "priority": "high",
    "status": "todo",
    "sales_id": 2,
    "created_at": "2025-12-26T10:30:00Z"
  }
}
```

#### PATCH /api-v1-tasks/{id}

Update an existing task.

**Required scope**: `tasks:write`

**Parameters**:
- `id` (path, required): Task ID

**Request body**:
```json
{
  "status": "done",
  "done_date": "2025-12-26"
}
```

**Response**:
```json
{
  "data": {
    "id": 42,
    "status": "done",
    "done_date": "2025-12-26",
    ...
  }
}
```

#### DELETE /api-v1-tasks/{id}

Delete a task.

**Required scope**: `tasks:write`

**Parameters**:
- `id` (path, required): Task ID

**Response** (204 No Content)

---

### Activities (Notes)

#### POST /api-v1-activities

Create a note attached to a contact, company, deal, or task.

**Required scope**: `activities:write`

**Supported note types**:
- `contact_note` - Note attached to a contact
- `company_note` - Note attached to a company
- `deal_note` - Note attached to a deal
- `task_note` - Note attached to a task

**Note**: For creating tasks (to-do items), use the `/api-v1-tasks` endpoint instead.

**Request body for contact note**:
```json
{
  "type": "contact_note",
  "contact_id": 1,
  "text": "Follow-up call scheduled for next week",
  "status": "cold"
}
```

**Request body for company note**:
```json
{
  "type": "company_note",
  "company_id": 5,
  "text": "Annual contract renewal discussion",
  "status": "warm"
}
```

**Request body for deal note**:
```json
{
  "type": "deal_note",
  "deal_id": 10,
  "text": "Customer requested custom pricing"
}
```

**Request body for task note**:
```json
{
  "type": "task_note",
  "task_id": 42,
  "text": "Blocked by infrastructure team - waiting for API access"
}
```

**Including attachments** (supported for all note types):
```json
{
  "type": "contact_note",
  "contact_id": 1,
  "text": "Discussed pricing structure",
  "attachments": [
    {
      "url": "https://storage.example.com/proposal.pdf",
      "name": "proposal.pdf",
      "type": "application/pdf"
    },
    {
      "url": "https://storage.example.com/pricing.xlsx",
      "name": "pricing.xlsx",
      "type": "application/vnd.ms-excel"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": 15,
    "text": "Follow-up call scheduled for next week",
    "contact_id": 1,
    "sales_id": 2,
    "date": "2025-12-26T10:30:00Z",
    ...
  },
  "type": "contact_note"
}
```

---

## Error Responses

The API uses standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "status": 401,
  "message": "Invalid API key"
}
```

---

## Webhooks

Webhooks allow you to receive real-time notifications when events occur in your CRM.

### Creating a Webhook

1. Navigate to **Integrations → Webhooks** in the dashboard
2. Click **Create Webhook**
3. Enter a name and webhook URL
4. Select the events you want to subscribe to
5. Save the webhook

### Webhook Events

#### Contact Events
- `contact.created` - New contact created
- `contact.updated` - Contact updated
- `contact.deleted` - Contact deleted

#### Company Events
- `company.created` - New company created
- `company.updated` - Company updated
- `company.deleted` - Company deleted

#### Deal Events
- `deal.created` - New deal created
- `deal.updated` - Deal updated
- `deal.deleted` - Deal deleted
- `deal.stage_changed` - Deal moved to a different stage
- `deal.won` - Deal marked as won
- `deal.lost` - Deal marked as lost

#### Task Events
- `task.completed` - Task marked as done

### Webhook Payload

All webhook requests include the following headers:

```http
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Event: contact.created
User-Agent: AtomicCRM-Webhooks/1.0
```

Example payload for `contact.created`:

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": [{"email": "john@example.com", "type": "Work"}],
  "created_at": "2025-12-19T10:00:00Z",
  ...
}
```

Example payload for `deal.stage_changed`:

```json
{
  "deal_id": 10,
  "old_stage": "proposal",
  "new_stage": "won",
  "deal": {
    "id": 10,
    "name": "Enterprise License",
    ...
  }
}
```

### Signature Verification

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature. You should verify this signature to ensure the webhook came from RealTimeX CRM.

**Node.js example**:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your_webhook_secret'; // From webhook settings

  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook
  console.log('Event:', req.headers['x-webhook-event']);
  console.log('Data:', req.body);

  res.status(200).send('OK');
});
```

**Python example**:

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature == expected_signature

# In your webhook handler:
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    secret = 'your_webhook_secret'

    if not verify_webhook_signature(payload, signature, secret):
        return 'Invalid signature', 401

    event = request.headers.get('X-Webhook-Event')
    data = request.json

    # Process the webhook
    print(f'Event: {event}')
    print(f'Data: {data}')

    return 'OK', 200
```

### Webhook Retries

If your webhook endpoint returns a non-2xx status code, RealTimeX CRM will retry delivery:

- **Retry 1**: After 1 minute
- **Retry 2**: After 5 minutes
- **Retry 3**: After 15 minutes

After 3 failed attempts, the webhook delivery is marked as failed and will not be retried.

---

## Code Examples

### cURL

```bash
# Get a contact
curl -X GET "https://your-project.supabase.co/functions/v1/api-v1-contacts/1" \
  -H "Authorization: Bearer ak_live_your_api_key_here"

# Create a contact
curl -X POST "https://your-project.supabase.co/functions/v1/api-v1-contacts" \
  -H "Authorization: Bearer ak_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": [{"email": "jane@example.com", "type": "Work"}]
  }'
```

### JavaScript/TypeScript

```typescript
const API_KEY = 'ak_live_your_api_key_here';
const BASE_URL = 'https://your-project.supabase.co/functions/v1';

async function getContact(id: number) {
  const response = await fetch(`${BASE_URL}/api-v1-contacts/${id}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { data } = await response.json();
  return data;
}

async function createContact(contactData: any) {
  const response = await fetch(`${BASE_URL}/api-v1-contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const { data } = await response.json();
  return data;
}
```

### Python

```python
import requests

API_KEY = 'ak_live_your_api_key_here'
BASE_URL = 'https://your-project.supabase.co/functions/v1'

def get_contact(contact_id):
    response = requests.get(
        f'{BASE_URL}/api-v1-contacts/{contact_id}',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    response.raise_for_status()
    return response.json()['data']

def create_contact(contact_data):
    response = requests.post(
        f'{BASE_URL}/api-v1-contacts',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json=contact_data
    )
    response.raise_for_status()
    return response.json()['data']
```

---

## Support

For issues or questions:
- GitHub: https://github.com/therealtimex/realtimex-crm/issues
- Documentation: https://github.com/therealtimex/realtimex-crm

## Changelog

### v1.3.0 (2025-12-26)
- **New Tasks endpoint** (`/api-v1-tasks`):
  - Full CRUD operations for tasks (GET, POST, PATCH, DELETE)
  - List/filter tasks by contact_id, company_id, deal_id, or status
  - New scopes: `tasks:read` and `tasks:write`
- **Activities endpoint** (`/api-v1-activities`):
  - Now focused exclusively on notes (contact, company, deal, task notes)
  - Task creation moved to dedicated `/api-v1-tasks` endpoint
  - Improved error message directs users to tasks endpoint

### v1.2.0 (2025-12-26)
- **Activities endpoint enhancements**:
  - Added support for `company_note` activity type
  - Added support for `task_note` activity type
  - Documented attachments support for all note types (contact, company, deal, task)
  - Improved error messages to list all valid activity types

### v1.1.0 (2025-12-24)
- Added search support for Contacts (by email)
- Added search support for Companies (by name and website)

### v1.0.0 (2025-12-19)
- Initial API release
- Contact, Company, Deal, and Activity endpoints
- Webhook support for CRUD and business events
- API key authentication with scopes
- Rate limiting (100 req/min)
