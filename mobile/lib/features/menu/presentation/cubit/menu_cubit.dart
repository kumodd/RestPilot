// ============================================================
// RestPilot — Menu Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../domain/entities/menu_entity.dart';
import '../../domain/usecases/menu_usecases.dart';

part 'menu_state.dart';

class MenuCubit extends Cubit<MenuState> {
  final FetchMenu _fetchMenu;
  final SaveCategory _saveCategory;
  final DeleteCategory _deleteCategory;
  final SaveMenuItem _saveMenuItem;
  final DeleteMenuItem _deleteMenuItem;
  final ToggleAvailability _toggleAvailability;
  final RealtimeManager _realtime;

  String? _currentRestaurantId;

  MenuCubit({
    required FetchMenu fetchMenu,
    required SaveCategory saveCategory,
    required DeleteCategory deleteCategory,
    required SaveMenuItem saveMenuItem,
    required DeleteMenuItem deleteMenuItem,
    required ToggleAvailability toggleAvailability,
    required RealtimeManager realtimeManager,
  })  : _fetchMenu = fetchMenu,
        _saveCategory = saveCategory,
        _deleteCategory = deleteCategory,
        _saveMenuItem = saveMenuItem,
        _deleteMenuItem = deleteMenuItem,
        _toggleAvailability = toggleAvailability,
        _realtime = realtimeManager,
        super(const MenuInitial());

  Future<void> loadMenu(String restaurantId) async {
    _currentRestaurantId = restaurantId;
    emit(const MenuLoading());
    try {
      final categories = await _fetchMenu(restaurantId);
      emit(MenuLoaded(categories: categories, isProcessing: false));
      _subscribeToRealtime(restaurantId);
    } on Failure catch (e) {
      emit(MenuError(e.message));
    } catch (e) {
      emit(MenuError(e.toString()));
    }
  }

  void _subscribeToRealtime(String restaurantId) {
    _realtime.subscribe(
      channelName: 'menu_cat-$restaurantId',
      table: 'menu_categories',
      filterColumn: 'restaurant_id',
      filterValue: restaurantId,
      onEvent: (_) => _refreshSilent(restaurantId),
    );
    _realtime.subscribe(
      channelName: 'menu_item-$restaurantId',
      table: 'menu_items',
      filterColumn: 'restaurant_id',
      filterValue: restaurantId,
      onEvent: (_) => _refreshSilent(restaurantId),
    );
  }

  Future<void> _refreshSilent(String restaurantId) async {
    try {
      final categories = await _fetchMenu(restaurantId);
      if (!isClosed && state is MenuLoaded) {
        emit((state as MenuLoaded).copyWith(categories: categories, isProcessing: false));
      }
    } catch (_) {}
  }

  Future<void> toggleItemAvailability(String itemId, bool isAvailable) async {
    final currentState = state;
    if (currentState is! MenuLoaded) return;
    try {
      await _toggleAvailability(itemId, isAvailable);
      // Realtime will refresh
    } catch (e) {
      emit(MenuActionError(categories: currentState.categories, error: 'Failed to update availability'));
    }
  }

  // Simplified save wrappers that just rely on realtime updates to redraw
  Future<void> saveCategory(MenuCategory cat) async {
    final currentState = state;
    if (currentState is! MenuLoaded) return;
    emit(currentState.copyWith(isProcessing: true));
    try {
      await _saveCategory(cat);
      emit(currentState.copyWith(isProcessing: false));
    } catch (e) {
      emit(MenuActionError(categories: currentState.categories, error: 'Failed to save category'));
    }
  }

  Future<void> saveMenuItem(MenuItem item) async {
    final currentState = state;
    if (currentState is! MenuLoaded) return;
    emit(currentState.copyWith(isProcessing: true));
    try {
      await _saveMenuItem(item);
      emit(currentState.copyWith(isProcessing: false));
    } catch (e) {
      emit(MenuActionError(categories: currentState.categories, error: 'Failed to save item'));
    }
  }

  @override
  Future<void> close() {
    if (_currentRestaurantId != null) {
      _realtime.unsubscribe('menu_cat-$_currentRestaurantId');
      _realtime.unsubscribe('menu_item-$_currentRestaurantId');
    }
    return super.close();
  }
}
