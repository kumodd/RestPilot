// ============================================================
// RestPilot — Tables Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/restaurant_table.dart';

abstract class TablesRemoteDataSource {
  Future<List<RestaurantTable>> fetchTables(String branchId);
  Future<RestaurantTable> addTable(RestaurantTable table);
  Future<void> updateTableStatus(String tableId, String status);
}

class TablesRemoteDataSourceImpl implements TablesRemoteDataSource {
  @override
  Future<List<RestaurantTable>> fetchTables(String branchId) async {
    final data = await withRetry(() => supabase
        .from('restaurant_tables')
        .select('*')
        .eq('branch_id', branchId)
        .order('table_number', ascending: true));

    return (data as List).map((e) => _mapToTable(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<RestaurantTable> addTable(RestaurantTable table) async {
    final data = await withRetry(() => supabase.from('restaurant_tables').insert({
          'restaurant_id': table.restaurantId,
          'branch_id': table.branchId,
          'table_number': table.tableNumber,
          if (table.displayName != null) 'display_name': table.displayName,
          'capacity': table.capacity,
          'qr_token': table.qrToken,
          'status': 'available', // Default status
        }).select().single());

    return RestaurantTable(
      id: data['id'] as String,
      restaurantId: data['restaurant_id'] as String,
      branchId: data['branch_id'] as String,
      tableNumber: data['table_number'] as String,
      displayName: data['display_name'] as String?,
      capacity: data['capacity'] as int,
      qrToken: data['qr_token'] as String,
      status: data['status'] as String,
      isActive: true,
    );
  }

  @override
  Future<void> updateTableStatus(String tableId, String status) async {
    await withRetry(() => supabase
        .from('restaurant_tables')
        .update({'status': status})
        .eq('id', tableId));
  }

  RestaurantTable _mapToTable(Map<String, dynamic> m) {
    return RestaurantTable(
      id: m['id'] as String,
      restaurantId: m['restaurant_id'] as String,
      branchId: m['branch_id'] as String,
      tableNumber: m['table_number'] as String,
      displayName: m['display_name'] as String?,
      capacity: m['capacity'] as int,
      status: m['status'] as String,
      qrToken: m['qr_token'] as String,
      isActive: m['is_active'] as bool? ?? true,
      createdAt: m['created_at'] as String?,
    );
  }
}
