// ============================================================
// RestPilot — Order Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/order.dart';

abstract class OrderRemoteDataSource {
  Future<List<Order>> fetchLiveOrders(String branchId);
  Future<List<Order>> fetchKitchenOrders(String branchId);
  Future<List<Order>> fetchCashierOrders(String branchId);
  Future<void> transitionOrderStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  });
  Future<Map<String, dynamic>> processPayment({
    required String orderId,
    required String method,
    required double amount,
    String? externalReference,
  });
  Future<void> updateOrderItemStatus(String itemId, String newStatus);
}

// ── Shared query projection ────────────────────────────────
const _kOrderSelect = '''
  id, restaurant_id, branch_id, order_number, status,
  customer_name_snapshot, customer_phone_snapshot, customer_notes,
  subtotal, discount, tax, service_charge, total,
  placed_at, confirmed_at, kitchen_accepted_at, preparing_started_at,
  ready_at, served_at, completed_at, cancelled_at,
  restaurant_tables(table_number, display_name),
  order_items(id, order_id, item_name_snapshot, unit_price_snapshot, quantity,
    line_total, status, special_instructions, kitchen_station, added_by_actor_type),
  payments(amount, method, status, created_at)
''';

// ── Item-only projection (for KDS) ─────────────────────────
const _kOrderItemSelect = '''
  id, restaurant_id, branch_id, order_number, status,
  customer_name_snapshot, customer_notes,
  subtotal, discount, tax, service_charge, total,
  placed_at, confirmed_at, kitchen_accepted_at, preparing_started_at,
  ready_at, served_at, completed_at, cancelled_at,
  restaurant_tables(table_number, display_name),
  order_items(id, order_id, item_name_snapshot, unit_price_snapshot, quantity,
    line_total, status, special_instructions, kitchen_station, added_by_actor_type),
  payments(amount, method, status, created_at)
''';

class OrderRemoteDataSourceImpl implements OrderRemoteDataSource {
  @override
  Future<List<Order>> fetchLiveOrders(String branchId) async {
    final data = await withRetry(() => supabase
        .from('orders')
        .select(_kOrderSelect)
        .eq('branch_id', branchId)
        .inFilter('status', [
          'placed', 'awaiting_waiter_verification', 'waiter_reviewing',
          'confirmed', 'kitchen_accepted', 'preparing', 'ready', 'served',
        ])
        .order('created_at', ascending: true));
    return (data as List).map((e) => _orderFromMap(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<Order>> fetchKitchenOrders(String branchId) async {
    final data = await withRetry(() => supabase
        .from('orders')
        .select(_kOrderItemSelect)
        .eq('branch_id', branchId)
        .inFilter('status', ['confirmed', 'kitchen_accepted', 'preparing', 'ready'])
        .order('confirmed_at', ascending: true, nullsFirst: false));
    return (data as List).map((e) => _orderFromMap(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<Order>> fetchCashierOrders(String branchId) async {
    final data = await withRetry(() => supabase
        .from('orders')
        .select(_kOrderSelect)
        .eq('branch_id', branchId)
        .inFilter('status', ['ready', 'served', 'completed'])
        .order('placed_at', ascending: false)
        .limit(50));
    return (data as List).map((e) => _orderFromMap(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<void> transitionOrderStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  }) async {
    final result = await withRetry(() => supabase.rpc('transition_order_status', params: {
          'p_order_id': orderId,
          'p_new_status': newStatus,
          'p_actor_id': actorId,
          'p_actor_type': actorType,
        }));
    if (result is Map && result['error'] != null) {
      throw ServerFailure(result['error'] as String, code: 'transition_order_status');
    }
  }

  @override
  Future<Map<String, dynamic>> processPayment({
    required String orderId,
    required String method,
    required double amount,
    String? externalReference,
  }) async {
    final result = await withRetry(() => supabase.rpc('process_secure_payment', params: {
          'p_order_id': orderId,
          'p_method': method,
          'p_amount': amount,
          if (externalReference != null) 'p_external_reference': externalReference,
        }));
    if (result is Map && result['error'] != null) {
      throw ServerFailure(result['error'] as String, code: 'process_secure_payment');
    }
    return (result as Map<String, dynamic>?) ?? {};
  }

  @override
  Future<void> updateOrderItemStatus(String itemId, String newStatus) async {
    await withRetry(() => supabase
        .from('order_items')
        .update({'status': newStatus})
        .eq('id', itemId));
  }

  // ── Mapper ─────────────────────────────────────────────────
  Order _orderFromMap(Map<String, dynamic> m) {
    final tableRaw = m['restaurant_tables'];
    OrderTableInfo? table;
    if (tableRaw is Map) {
      table = OrderTableInfo(
        tableNumber: tableRaw['table_number'] as String? ?? '?',
        displayName: tableRaw['display_name'] as String?,
      );
    }

    final itemsRaw = m['order_items'] as List? ?? [];
    final items = itemsRaw.map((i) {
      final item = i as Map<String, dynamic>;
      return OrderItem(
        id: item['id'] as String,
        orderId: item['order_id'] as String? ?? m['id'] as String,
        itemNameSnapshot: item['item_name_snapshot'] as String? ?? '',
        unitPriceSnapshot: (item['unit_price_snapshot'] as num?)?.toDouble() ?? 0,
        quantity: item['quantity'] as int? ?? 1,
        lineTotal: (item['line_total'] as num?)?.toDouble() ?? 0,
        status: item['status'] as String? ?? 'pending',
        specialInstructions: item['special_instructions'] as String?,
        kitchenStation: item['kitchen_station'] as String?,
        addedByActorType: item['added_by_actor_type'] as String? ?? 'customer',
      );
    }).toList();

    final paymentsRaw = m['payments'] as List? ?? [];
    final payments = paymentsRaw.map((p) {
      final pay = p as Map<String, dynamic>;
      return PaymentInfo(
        amount: (pay['amount'] as num?)?.toDouble() ?? 0,
        method: pay['method'] as String?,
        status: pay['status'] as String? ?? 'pending',
        createdAt: pay['created_at'] as String?,
      );
    }).toList();

    return Order(
      id: m['id'] as String,
      restaurantId: m['restaurant_id'] as String? ?? '',
      branchId: m['branch_id'] as String? ?? '',
      orderNumber: m['order_number'] as int? ?? 0,
      status: m['status'] as String? ?? 'placed',
      customerNameSnapshot: m['customer_name_snapshot'] as String?,
      customerPhoneSnapshot: m['customer_phone_snapshot'] as String?,
      customerNotes: m['customer_notes'] as String?,
      subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
      tax: (m['tax'] as num?)?.toDouble() ?? 0,
      serviceCharge: (m['service_charge'] as num?)?.toDouble() ?? 0,
      discount: (m['discount'] as num?)?.toDouble() ?? 0,
      total: (m['total'] as num?)?.toDouble() ?? 0,
      placedAt: m['placed_at'] as String?,
      confirmedAt: m['confirmed_at'] as String?,
      kitchenAcceptedAt: m['kitchen_accepted_at'] as String?,
      preparingStartedAt: m['preparing_started_at'] as String?,
      readyAt: m['ready_at'] as String?,
      servedAt: m['served_at'] as String?,
      completedAt: m['completed_at'] as String?,
      cancelledAt: m['cancelled_at'] as String?,
      table: table,
      items: items,
      payments: payments,
    );
  }
}
