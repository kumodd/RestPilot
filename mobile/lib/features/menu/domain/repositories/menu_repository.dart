import '../entities/menu_entity.dart';

abstract class MenuRepository {
  Future<List<MenuCategory>> fetchMenu(String restaurantId);
  Future<MenuCategory> saveCategory(MenuCategory category);
  Future<void> deleteCategory(String categoryId);
  Future<MenuItem> saveMenuItem(MenuItem item);
  Future<void> deleteMenuItem(String itemId);
  Future<void> toggleAvailability(String itemId, bool isAvailable);
}
