// ============================================================
// RestPilot — Cashier Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../../../core/utils/constants.dart';
import '../../../orders/domain/entities/order.dart';
import '../../../orders/domain/usecases/fetch_live_orders.dart'; // We use FetchCashierOrders
import '../../../orders/domain/usecases/process_payment.dart';

part 'cashier_state.dart';

class CashierCubit extends Cubit<CashierState> {
  final FetchCashierOrders _fetchCashierOrders;
  final ProcessPayment _processPayment;
  final RealtimeManager _realtime;

  String? _currentBranchId;

  CashierCubit({
    required FetchCashierOrders fetchCashierOrders,
    required ProcessPayment processPayment,
    required RealtimeManager realtimeManager,
  })  : _fetchCashierOrders = fetchCashierOrders,
        _processPayment = processPayment,
        _realtime = realtimeManager,
        super(const CashierInitial());

  Future<void> loadOrders(String branchId) async {
    _currentBranchId = branchId;
    emit(const CashierLoading());
    try {
      final orders = await _fetchCashierOrders(branchId);
      emit(CashierLoaded(orders: orders, isProcessing: false));
      _subscribeToRealtime(branchId);
    } on Failure catch (e) {
      emit(CashierError(e.message));
    } catch (e) {
      emit(CashierError(e.toString()));
    }
  }

  void _subscribeToRealtime(String branchId) {
    final channelName = AppConstants.cashierChannel(branchId);
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
    _realtime.subscribe(
      channelName: '$channelName-payments',
      table: 'payments',
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
      final orders = await _fetchCashierOrders(branchId);
      if (!isClosed && state is CashierLoaded) {
        emit((state as CashierLoaded)
            .copyWith(orders: orders, isProcessing: false));
      }
    } catch (_) {}
  }

  Future<void> processPayment({
    required String orderId,
    required String method,
    required double amount,
    String? reference,
  }) async {
    final currentState = state;
    if (currentState is! CashierLoaded || currentState.isProcessing) return;

    emit(currentState.copyWith(isProcessing: true, processingOrderId: orderId));

    try {
      await _processPayment(
        orderId: orderId,
        method: method,
        amount: amount,
        externalReference: reference,
      );
      // Realtime (orders) will catch the completion, but we also manually refresh
      // just in case since payments table isn't broadcasted (B2)
      if (_currentBranchId != null) {
        await _refreshSilent(_currentBranchId!);
      }
    } on Failure catch (e) {
      emit(CashierActionError(orders: currentState.orders, error: e.message));
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    } catch (e) {
      emit(
          CashierActionError(orders: currentState.orders, error: e.toString()));
      emit(currentState.copyWith(isProcessing: false, processingOrderId: null));
    }
  }

  @override
  Future<void> close() {
    if (_currentBranchId != null) {
      _realtime.unsubscribe(AppConstants.cashierChannel(_currentBranchId!));
      _realtime.unsubscribe(
          '${AppConstants.cashierChannel(_currentBranchId!)}-payments');
    }
    return super.close();
  }
}
