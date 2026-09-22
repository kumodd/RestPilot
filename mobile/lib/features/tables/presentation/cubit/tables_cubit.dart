// ============================================================
// RestPilot — Tables Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../../../core/utils/constants.dart';
import '../../domain/entities/restaurant_table.dart';
import '../../domain/usecases/tables_usecases.dart';

part 'tables_state.dart';

class TablesCubit extends Cubit<TablesState> {
  final FetchTables _fetchTables;
  final AddTable _addTable;
  final GenerateQrCode _generateQrCode;
  final RealtimeManager _realtime;
  
  String? _currentBranchId;

  TablesCubit({
    required FetchTables fetchTables,
    required AddTable addTable,
    required GenerateQrCode generateQrCode,
    required RealtimeManager realtimeManager,
  })  : _fetchTables = fetchTables,
        _addTable = addTable,
        _generateQrCode = generateQrCode,
        _realtime = realtimeManager,
        super(const TablesInitial());

  Future<void> loadTables(String branchId) async {
    _currentBranchId = branchId;
    emit(const TablesLoading());
    try {
      final tables = await _fetchTables(branchId);
      emit(TablesLoaded(tables: tables, isProcessing: false));
      _subscribeToRealtime(branchId);
    } on Failure catch (e) {
      emit(TablesError(e.message));
    } catch (e) {
      emit(TablesError(e.toString()));
    }
  }

  void _subscribeToRealtime(String branchId) {
    final channelName = AppConstants.tablesChannel(branchId);
    _realtime.subscribe(
      channelName: channelName,
      table: 'restaurant_tables',
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
      final tables = await _fetchTables(branchId);
      if (!isClosed && state is TablesLoaded) {
        emit((state as TablesLoaded).copyWith(tables: tables, isProcessing: false));
      }
    } catch (_) {}
  }

  Future<void> addNewTable({
    required String restaurantId,
    required String branchId,
    required String tableNumber,
    String? displayName,
    required int capacity,
  }) async {
    final currentState = state;
    if (currentState is! TablesLoaded || currentState.isProcessing) return;

    emit(currentState.copyWith(isProcessing: true));

    try {
      final token = _generateQrCode('temp_$tableNumber');
      await _addTable(
        RestaurantTable(
          id: '', // Set by server
          restaurantId: restaurantId,
          branchId: branchId,
          tableNumber: tableNumber,
          displayName: displayName,
          capacity: capacity,
          qrToken: token,
          status: 'available',
          isActive: true,
        ),
      );
      // Wait for realtime update to refresh the list naturally, but we unlock
      emit(currentState.copyWith(isProcessing: false));
    } on Failure catch (e) {
      emit(TablesActionError(tables: currentState.tables, error: e.message));
      emit(currentState.copyWith(isProcessing: false));
    } catch (e) {
      emit(TablesActionError(tables: currentState.tables, error: e.toString()));
      emit(currentState.copyWith(isProcessing: false));
    }
  }

  @override
  Future<void> close() {
    if (_currentBranchId != null) {
      _realtime.unsubscribe(AppConstants.tablesChannel(_currentBranchId!));
    }
    return super.close();
  }
}
