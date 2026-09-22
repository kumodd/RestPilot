// ============================================================
// RestPilot — Live Order Board Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../../../core/utils/constants.dart';
import '../../../orders/domain/entities/order.dart';
import '../../../orders/domain/usecases/fetch_live_orders.dart';
import '../../../orders/domain/usecases/transition_order_status.dart';

part 'live_order_board_state.dart';

class LiveOrderBoardCubit extends Cubit<LiveOrderBoardState> {
  final FetchLiveOrders _fetchLiveOrders;
  final TransitionOrderStatus _transitionOrderStatus;
  final RealtimeManager _realtime;
  
  String? _currentBranchId;

  LiveOrderBoardCubit({
    required FetchLiveOrders fetchLiveOrders,
    required TransitionOrderStatus transitionOrderStatus,
    required RealtimeManager realtimeManager,
  })  : _fetchLiveOrders = fetchLiveOrders,
        _transitionOrderStatus = transitionOrderStatus,
        _realtime = realtimeManager,
        super(const LiveOrderBoardInitial());

  /// Load initial data and subscribe to realtime updates
  Future<void> loadOrders(String branchId) async {
    _currentBranchId = branchId;
    emit(const LiveOrderBoardLoading());
    try {
      final orders = await _fetchLiveOrders(branchId);
      emit(LiveOrderBoardLoaded(orders: orders, isProcessing: false));
      _subscribeToRealtime(branchId);
    } on Failure catch (e) {
      emit(LiveOrderBoardError(e.message));
    } catch (e) {
      emit(LiveOrderBoardError(e.toString()));
    }
  }

  void _subscribeToRealtime(String branchId) {
    final channelName = AppConstants.liveOrdersChannel(branchId);
    _realtime.subscribe(
      channelName: channelName,
      table: 'orders',
      filterColumn: 'branch_id',
      filterValue: branchId,
      onEvent: (payload) {
        // Only re-fetch on meaningful updates to avoid complex payload merging logic,
        // matching the web behavior which invalidates the query.
        if (!isClosed && _currentBranchId == branchId) {
           _refreshSilent(branchId);
        }
      },
    );
  }

  Future<void> _refreshSilent(String branchId) async {
    try {
      final orders = await _fetchLiveOrders(branchId);
      if (!isClosed && state is LiveOrderBoardLoaded) {
        emit((state as LiveOrderBoardLoaded).copyWith(orders: orders, isProcessing: false));
      }
    } catch (_) {}
  }

  /// Advance order status. Prevents double-taps by setting isProcessing=true.
  Future<void> advanceStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  }) async {
    final currentState = state;
    if (currentState is! LiveOrderBoardLoaded || currentState.isProcessing) return;

    emit(currentState.copyWith(isProcessing: true, processingOrderId: orderId));

    try {
      await _transitionOrderStatus(
        orderId: orderId,
        newStatus: newStatus,
        actorId: actorId,
        actorType: actorType,
      );
      // Wait for realtime update to refresh the list, but we can optimistically unlock
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    } on Failure catch (e) {
      emit(LiveOrderBoardActionError(orders: currentState.orders, error: e.message));
      // Revert processing state
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    } catch (e) {
      emit(LiveOrderBoardActionError(orders: currentState.orders, error: e.toString()));
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    }
  }

  @override
  Future<void> close() {
    if (_currentBranchId != null) {
      _realtime.unsubscribe(AppConstants.liveOrdersChannel(_currentBranchId!));
    }
    return super.close();
  }
}
