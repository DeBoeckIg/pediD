import { describe, expect, it } from 'vitest';
import { aggregateAdminStatistics } from '../src/modules/analytics/admin-service';

const order = (status: string, total: number, created_at = '2025-01-02T12:00:00.000Z') => ({ status, created_at, order_items: [{ product_name: 'Miel', variant_label: '500g', unit_price_ars: total, quantity: 1 }] });
describe('admin statistics aggregation', () => {
  it('counts only completed orders as realized sales', () => { const result = aggregateAdminStatistics([order('completed', 100), order('confirmed', 200), order('pending', 300), order('cancelled', 400)]); expect(result.kpis).toMatchObject({ completedSalesTotal: 100, completedOrderCount: 1, averageCompletedTicket: 100, confirmedPipelineTotal: 200, pendingCount: 1 }); });
  it('applies inclusive date filters and handles malformed values safely', () => { const result = aggregateAdminStatistics([order('completed', 'bad', '2025-01-01T00:00:00.000Z'), order('completed', 50, '2025-01-03T00:00:00.000Z')], [], { from: '2025-01-01', to: '2025-01-02' }); expect(result.kpis.completedSalesTotal).toBe(0); expect(result.dailyCompletedSales).toHaveLength(1); });
  it('flags variants at or below five units', () => { const result = aggregateAdminStatistics([], [{ id: 'a', product_name: 'Miel', label: '500g', stock_quantity: 5 }, { id: 'b', stock_quantity: 6 }]); expect(result.lowStock.map(x => x.id)).toEqual(['a']); });
});
