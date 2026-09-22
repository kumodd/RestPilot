import '../../domain/repositories/menu_repository.dart';
import '../../domain/entities/menu_entity.dart';
import '../datasources/menu_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class MenuRepositoryImpl implements MenuRepository {
  final MenuRemoteDataSource _ds;
  const MenuRepositoryImpl(this._ds);

  @override
  Future<List<MenuCategory>> fetchMenu(String restaurantId) async {
    try {
      return await _ds.fetchMenu(restaurantId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to load menu', cause: e);
    }
  }

  @override
  Future<MenuCategory> saveCategory(MenuCategory category) async {
    try {
      return await _ds.saveCategory(category);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to save category', cause: e);
    }
  }

  @override
  Future<void> deleteCategory(String categoryId) async {
    try {
      await _ds.deleteCategory(categoryId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to delete category', cause: e);
    }
  }

  @override
  Future<MenuItem> saveMenuItem(MenuItem item) async {
    try {
      return await _ds.saveMenuItem(item);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to save menu item', cause: e);
    }
  }

  @override
  Future<void> deleteMenuItem(String itemId) async {
    try {
      await _ds.deleteMenuItem(itemId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to delete menu item', cause: e);
    }
  }

  @override
  Future<void> toggleAvailability(String itemId, bool isAvailable) async {
    try {
      await _ds.toggleAvailability(itemId, isAvailable);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to update availability', cause: e);
    }
  }
}
