import '../entities/restaurant_table.dart';

abstract class TablesRepository {
  Future<List<RestaurantTable>> fetchTables(String branchId);
  Future<RestaurantTable> addTable(RestaurantTable table);
  Future<void> updateTableStatus(String tableId, String status);
}
