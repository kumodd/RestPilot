import '../repositories/menu_repository.dart';
import '../entities/menu_entity.dart';

class FetchMenu {
  final MenuRepository _repo;
  const FetchMenu(this._repo);
  Future<List<MenuCategory>> call(String restaurantId) => _repo.fetchMenu(restaurantId);
}

class SaveCategory {
  final MenuRepository _repo;
  const SaveCategory(this._repo);
  Future<MenuCategory> call(MenuCategory category) => _repo.saveCategory(category);
}

class DeleteCategory {
  final MenuRepository _repo;
  const DeleteCategory(this._repo);
  Future<void> call(String categoryId) => _repo.deleteCategory(categoryId);
}

class SaveMenuItem {
  final MenuRepository _repo;
  const SaveMenuItem(this._repo);
  Future<MenuItem> call(MenuItem item) => _repo.saveMenuItem(item);
}

class DeleteMenuItem {
  final MenuRepository _repo;
  const DeleteMenuItem(this._repo);
  Future<void> call(String itemId) => _repo.deleteMenuItem(itemId);
}

class ToggleAvailability {
  final MenuRepository _repo;
  const ToggleAvailability(this._repo);
  Future<void> call(String itemId, bool isAvailable) => _repo.toggleAvailability(itemId, isAvailable);
}
