# Custom Frontend Integration

The pediD installation keeps the frontend and backend in the same deployment,
but the public UI can be replaced without changing the business modules.

## Boundary

Custom frontend code should communicate with the installation through the HTTP
API. It should not import the Supabase clients or query the database directly.

```text
Custom UI -> /api/* -> business modules -> Supabase
```

The API is relative to the installation origin. This keeps a customer's
customized frontend and its backend in the same installation and avoids
cross-origin session issues.

## Public API

### Catalog

```http
GET /api/catalog
```

Returns the published catalog grouped by category. Product fields include
`id`, `categoryId`, `categoryName`, `name`, `description`, `priceArs`,
`imageUrl`, and `availability`.

### Checkout

```http
POST /api/checkout
Content-Type: application/json
```

Request body:

```json
{
  "submissionKey": "browser-generated-idempotency-key",
  "customerName": "Ana",
  "customerSurname": "Perez",
  "paymentMethod": "cash",
  "deliveryMethod": "pickup",
  "items": [{ "productId": "product-id", "quantity": 2 }]
}
```

The server validates product availability, calculates prices from the database,
and creates the order. The frontend must not send trusted prices or totals.

## Admin API

Admin requests use the installation session cookie. The custom admin UI should
use `credentials: 'same-origin'` when calling these endpoints.

```http
POST /api/admin/login
GET  /api/admin/session
POST /api/admin/logout
GET  /api/admin/products
POST /api/admin/products
GET  /api/admin/categories
POST /api/admin/categories
GET  /api/admin/orders
POST /api/admin/orders/status
POST /api/admin/media
```

Admin routes remain protected by the server. A frontend must never use the
Supabase service-role key.

## Installation-specific values

The custom UI reads public branding from `installationConfig` when it lives in
this repository, or from the matching `NEXT_PUBLIC_*` environment variables
when it is implemented as a separate frontend package. The backend remains
responsible for Supabase credentials and server-side authorization.

## Customization workflow

1. Copy the installation template.
2. Configure the customer's Supabase and public installation variables.
3. Replace the public and admin UI while keeping the `/api/*` routes.
4. Run the existing API and domain tests.
5. Build and deploy the complete customer installation.
