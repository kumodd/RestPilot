// ============================================================
// RestPilot — Staff Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../domain/entities/staff_member.dart';
import '../../domain/usecases/staff_usecases.dart';

part 'staff_state.dart';

class StaffCubit extends Cubit<StaffState> {
  final FetchStaff _fetchStaff;
  final FetchInvitations _fetchInvitations;
  final InviteStaff _inviteStaff;
  final UpdatePermissions _updatePermissions;
  final ToggleStaffActive _toggleStaffActive;
  final RealtimeManager _realtime;

  String? _currentRestaurantId;

  StaffCubit({
    required FetchStaff fetchStaff,
    required FetchInvitations fetchInvitations,
    required InviteStaff inviteStaff,
    required UpdatePermissions updatePermissions,
    required ToggleStaffActive toggleStaffActive,
    required RealtimeManager realtimeManager,
  })  : _fetchStaff = fetchStaff,
        _fetchInvitations = fetchInvitations,
        _inviteStaff = inviteStaff,
        _updatePermissions = updatePermissions,
        _toggleStaffActive = toggleStaffActive,
        _realtime = realtimeManager,
        super(const StaffInitial());

  Future<void> loadStaff(String restaurantId) async {
    _currentRestaurantId = restaurantId;
    emit(const StaffLoading());
    try {
      final members = await _fetchStaff(restaurantId);
      final invitations = await _fetchInvitations(restaurantId);
      emit(StaffLoaded(
        members: members,
        invitations: invitations,
        isProcessing: false,
      ));
      _subscribeToRealtime(restaurantId);
    } on Failure catch (e) {
      emit(StaffError(e.message));
    } catch (e) {
      emit(StaffError(e.toString()));
    }
  }

  void _subscribeToRealtime(String restaurantId) {
    // We would typically subscribe to both staff_members and invitations
    // For brevity, we'll just handle silent refresh here on any changes
    _realtime.subscribe(
      channelName: 'staff-$restaurantId',
      table: 'staff_members',
      filterColumn: 'restaurant_id',
      filterValue: restaurantId,
      onEvent: (_) => _refreshSilent(restaurantId),
    );
    _realtime.subscribe(
      channelName: 'invitations-$restaurantId',
      table: 'invitations',
      filterColumn: 'restaurant_id',
      filterValue: restaurantId,
      onEvent: (_) => _refreshSilent(restaurantId),
    );
  }

  Future<void> _refreshSilent(String restaurantId) async {
    try {
      final members = await _fetchStaff(restaurantId);
      final invitations = await _fetchInvitations(restaurantId);
      if (!isClosed && state is StaffLoaded) {
        emit((state as StaffLoaded).copyWith(
          members: members,
          invitations: invitations,
          isProcessing: false,
        ));
      }
    } catch (_) {}
  }

  Future<void> inviteStaff({
    required String restaurantId,
    String? branchId,
    required String email,
    required String role,
    required Map<String, bool> permissions,
    required String invitedBy,
  }) async {
    final currentState = state;
    if (currentState is! StaffLoaded || currentState.isProcessing) return;

    emit(currentState.copyWith(isProcessing: true));
    try {
      await _inviteStaff(
        restaurantId: restaurantId,
        branchId: branchId,
        email: email,
        role: role,
        permissions: permissions,
        invitedBy: invitedBy,
      );
      emit(currentState.copyWith(isProcessing: false));
    } on Failure catch (e) {
      emit(StaffActionError(
        members: currentState.members,
        invitations: currentState.invitations,
        error: e.message,
      ));
      emit(currentState.copyWith(isProcessing: false));
    }
  }

  Future<void> toggleStaffActive(String staffId, bool isActive) async {
    final currentState = state;
    if (currentState is! StaffLoaded) return;
    try {
      await _toggleStaffActive(staffId, isActive);
    } catch (_) {
      emit(StaffActionError(
        members: currentState.members,
        invitations: currentState.invitations,
        error: 'Failed to update status',
      ));
    }
  }

  @override
  Future<void> close() {
    if (_currentRestaurantId != null) {
      _realtime.unsubscribe('staff-$_currentRestaurantId');
      _realtime.unsubscribe('invitations-$_currentRestaurantId');
    }
    return super.close();
  }
}
