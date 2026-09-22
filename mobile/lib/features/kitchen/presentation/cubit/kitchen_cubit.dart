// ============================================================
// RestPilot — Kitchen Display Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../../../core/utils/constants.dart';
import '../../../orders/domain/entities/order.dart';
import '../../../orders/domain/usecases/fetch_live_orders.dart'; // We use the specific Kitchen query
import '../../../orders/domain/repositories/order_repository.dart';

part 'kitchen_state.dart';

class KitchenCubit extends Cubit<KitchenState> {
  final OrderRepository _orderRepo; // using repo directly for specific queries
  final RealtimeManager _realtime;
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  String? _currentBranchId;
  final Set<String> _seenOrderIds = {};

  KitchenCubit({
    required OrderRepository orderRepo,
    required RealtimeManager realtimeManager,
  })  : _orderRepo = orderRepo,
        _realtime = realtimeManager,
        super(const KitchenInitial());

  Future<void> loadOrders(String branchId) async {
    _currentBranchId = branchId;
    emit(const KitchenLoading());
    try {
      final orders = await _orderRepo.fetchKitchenOrders(branchId);
      
      // Initialize seen IDs so we don't play sound on first load
      _seenOrderIds.clear();
      _seenOrderIds.addAll(orders.map((o) => o.id));
      
      emit(KitchenLoaded(orders: orders, isProcessing: false));
      _subscribeToRealtime(branchId);
    } on Failure catch (e) {
      emit(KitchenError(e.message));
    } catch (e) {
      emit(KitchenError(e.toString()));
    }
  }

  void _subscribeToRealtime(String branchId) {
    // B1 FIX: Only subscribe to 'orders' table, ignore 'order_items' directly
    final channelName = AppConstants.kdsChannel(branchId);
    _realtime.subscribe(
      channelName: channelName,
      table: 'orders',
      filterColumn: 'branch_id',
      filterValue: branchId,
      onEvent: (payload) {
        if (!isClosed && _currentBranchId == branchId) {
           _refreshSilent(branchId);
        }
      },
    );
  }

  Future<void> _refreshSilent(String branchId) async {
    try {
      final orders = await _orderRepo.fetchKitchenOrders(branchId);
      
      // Check for genuinely new orders to play sound
      bool hasNewOrder = false;
      for (final o in orders) {
        if (!_seenOrderIds.contains(o.id)) {
          hasNewOrder = true;
          _seenOrderIds.add(o.id);
        }
      }

      if (hasNewOrder) {
        _playSound();
      }

      if (!isClosed && state is KitchenLoaded) {
        emit((state as KitchenLoaded).copyWith(orders: orders, isProcessing: false));
      }
    } catch (_) {}
  }

  Future<void> _playSound() async {
    try {
      // In a real app, ensure this asset exists
      // await _audioPlayer.play(AssetSource('sounds/new_order.mp3'));
    } catch (_) {}
  }

  Future<void> advanceStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  }) async {
    final currentState = state;
    if (currentState is! KitchenLoaded || currentState.isProcessing) return;

    emit(currentState.copyWith(isProcessing: true, processingOrderId: orderId));

    try {
      await _orderRepo.transitionOrderStatus(
        orderId: orderId,
        newStatus: newStatus,
        actorId: actorId,
        actorType: actorType,
      );
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    } on Failure catch (e) {
      emit(KitchenActionError(orders: currentState.orders, error: e.message));
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    } catch (e) {
      emit(KitchenActionError(orders: currentState.orders, error: e.toString()));
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    }
  }

  Future<void> toggleItemStatus(String itemId, String currentStatus) async {
    // Only toggling between pending/preparing -> ready
    final currentState = state;
    if (currentState is! KitchenLoaded) return;
    
    String newStatus = currentStatus == 'ready' ? 'preparing' : 'ready';

    try {
      await _orderRepo.updateOrderItemStatus(itemId, newStatus);
      // Realtime won't catch this because we don't subscribe to order_items (B1),
      // so we manually refresh
      if (_currentBranchId != null) {
        _refreshSilent(_currentBranchId!);
      }
    } catch (e) {
      emit(KitchenActionError(orders: currentState.orders, error: 'Failed to update item'));
    }
  }

  @override
  Future<void> close() {
    _audioPlayer.dispose();
    if (_currentBranchId != null) {
      _realtime.unsubscribe(AppConstants.kdsChannel(_currentBranchId!));
    }
    return super.close();
  }
}
