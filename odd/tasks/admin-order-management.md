# Admin order management

## Objective
Support safe deletion of test orders from the authenticated admin surface.

## Checklist
- [x] Add transactional admin order deletion.
- [x] Expose protected DELETE route.
- [x] Cover route/service behavior with tests.

## Evidence
- Focused admin-order tests: 11 passed.
- Full backend Vitest: 121 passed across 14 files.
- Typecheck: remains blocked by pre-existing tuple-index errors in `tests/push-process.test.ts` lines 39 and 45.

## Authorized scope
- `app/api/admin/orders/route.ts`
- `src/modules/orders/admin-service.ts`
- `supabase/migrations/0024_admin_delete_orders.sql`
- `tests/admin-orders.test.ts`
