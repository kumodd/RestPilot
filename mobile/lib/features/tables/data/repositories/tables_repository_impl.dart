import '../../domain/repositories/tables_repository.dart';
import '../../domain/entities/restaurant_table.dart';
import '../datasources/tables_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class TablesRepositoryImpl implements TablesRepository {
  final TablesRemoteDataSource _ds;
  const TablesRepositoryImpl(this._ds);

  @override
  Future<List<RestaurantTable>> fetchTables(String branchId) async {
    try {
      return await _ds.fetchTables(branchId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to load tables', cause: e);
    }
  }

  @override
  Future<RestaurantTable> addTable(RestaurantTable table) async {
    try {
      return await _ds.addTable(table);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to add table', cause: e);
    }
  }

  @override
  Future<void> updateTableStatus(String tableId, String status) async {
    try {
      await _ds.updateTableStatus(tableId, status);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to update status', cause: e);
    }
  }
}
