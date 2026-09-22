import '../repositories/tables_repository.dart';
import '../entities/restaurant_table.dart';

class FetchTables {
  final TablesRepository _repo;
  const FetchTables(this._repo);
  Future<List<RestaurantTable>> call(String restaurantId) => _repo.fetchTables(restaurantId);
}

class AddTable {
  final TablesRepository _repo;
  const AddTable(this._repo);
  Future<RestaurantTable> call(RestaurantTable table) => _repo.addTable(table);
}

class GenerateQrCode {
  const GenerateQrCode();
  String call(String tableId) => 'https://restpilot.space/qr/$tableId';
}
