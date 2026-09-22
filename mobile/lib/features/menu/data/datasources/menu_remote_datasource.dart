// ============================================================
// RestPilot — Menu Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/menu_entity.dart';

abstract class MenuRemoteDataSource {
  Future<List<MenuCategory>> fetchMenu(String restaurantId);
  Future<MenuCategory> saveCategory(MenuCategory category);
  Future<void> deleteCategory(String categoryId);
  Future<MenuItem> saveMenuItem(MenuItem item);
  Future<void> deleteMenuItem(String itemId);
  Future<void> toggleAvailability(String itemId, bool isAvailable);
}

class MenuRemoteDataSourceImpl implements MenuRemoteDataSource {
  @override
  Future<List<MenuCategory>> fetchMenu(String restaurantId) async {
    final data = await withRetry(() => supabase
        .from('menu_categories')
        .select('''
          id, restaurant_id, name, description, sort_order, is_active,
          menu_items(
            id, category_id, restaurant_id, name, description, price,
            image_url, dietary_label, sort_order, is_available, is_active
          )
        ''')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order', ascending: true));

    return (data as List).map((e) {
      final c = e as Map<String, dynamic>;
      
      final rawItems = c['menu_items'] as List? ?? [];
      final items = rawItems
          .map((i) => _mapToMenuItem(i as Map<String, dynamic>))
          .where((item) => item.isActive)
          .toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

      return MenuCategory(
        id: c['id'] as String,
        restaurantId: c['restaurant_id'] as String,
        name: c['name'] as String,
        description: c['description'] as String?,
        sortOrder: c['sort_order'] as int? ?? 0,
        isActive: c['is_active'] as bool? ?? true,
        items: items,
      );
    }).toList();
  }

  @override
  Future<MenuCategory> saveCategory(MenuCategory category) async {
    final data = await withRetry(() => supabase
        .from('menu_categories')
        .upsert({
          if (category.id.isNotEmpty) 'id': category.id,
          'restaurant_id': category.restaurantId,
          'name': category.name,
          'description': category.description,
          'sort_order': category.sortOrder,
          'is_active': category.isActive,
        })
        .select()
        .single());

    return MenuCategory(
      id: data['id'] as String,
      restaurantId: data['restaurant_id'] as String,
      name: data['name'] as String,
      description: data['description'] as String?,
      sortOrder: data['sort_order'] as int? ?? 0,
      isActive: data['is_active'] as bool? ?? true,
      items: category.items,
    );
  }

  @override
  Future<void> deleteCategory(String categoryId) async {
    await withRetry(() => supabase
        .from('menu_categories')
        .update({'is_active': false})
        .eq('id', categoryId));
  }

  @override
  Future<MenuItem> saveMenuItem(MenuItem item) async {
    final data = await withRetry(() => supabase
        .from('menu_items')
        .upsert({
          if (item.id.isNotEmpty) 'id': item.id,
          'category_id': item.categoryId,
          'restaurant_id': item.restaurantId,
          'name': item.name,
          'description': item.description,
          'price': item.price,
          'image_url': item.imageUrl,
          'dietary_label': item.dietaryLabel,
          'sort_order': item.sortOrder,
          'is_available': item.isAvailable,
          'is_active': item.isActive,
        })
        .select()
        .single());

    return _mapToMenuItem(data);
  }

  @override
  Future<void> deleteMenuItem(String itemId) async {
    await withRetry(() => supabase
        .from('menu_items')
        .update({'is_active': false})
        .eq('id', itemId));
  }

  @override
  Future<void> toggleAvailability(String itemId, bool isAvailable) async {
    await withRetry(() => supabase
        .from('menu_items')
        .update({'is_available': isAvailable})
        .eq('id', itemId));
  }

  MenuItem _mapToMenuItem(Map<String, dynamic> i) {
    return MenuItem(
      id: i['id'] as String,
      categoryId: i['category_id'] as String,
      restaurantId: i['restaurant_id'] as String,
      name: i['name'] as String,
      description: i['description'] as String?,
      price: (i['price'] as num?)?.toDouble() ?? 0,
      imageUrl: i['image_url'] as String?,
      dietaryLabel: i['dietary_label'] as String?,
      sortOrder: i['sort_order'] as int? ?? 0,
      isAvailable: i['is_available'] as bool? ?? true,
      isActive: i['is_active'] as bool? ?? true,
    );
  }
}
