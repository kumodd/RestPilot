// ============================================================
// RestPilot — Context Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/domain/entities/user_profile.dart';
import '../../domain/entities/app_context.dart';
import '../../domain/usecases/load_context.dart';

part 'context_state.dart';

class ContextCubit extends Cubit<ContextState> {
  final LoadContext _loadContext;

  ContextCubit({required LoadContext loadContext})
      : _loadContext = loadContext,
        super(const ContextInitial());

  Future<void> load(UserProfile profile) async {
    emit(const ContextLoading());
    try {
      final context = await _loadContext(profile: profile);
      emit(ContextLoaded(context));
    } on Failure catch (e) {
      emit(ContextError(e.message));
    } catch (e) {
      emit(ContextError(e.toString()));
    }
  }

  void selectBranch(String restaurantId, String branchId) {
    if (state is ContextLoaded) {
      final currentState = state as ContextLoaded;
      final ctx = currentState.context;
      try {
        final restaurant = ctx.restaurants.firstWhere((r) => r.id == restaurantId);
        final branch = ctx.branches.firstWhere((b) => b.id == branchId);
        emit(ContextLoaded(ctx.copyWith(
          selectedRestaurant: restaurant,
          selectedBranch: branch,
        )));
      } catch (e) {
        // If not found, ignore the selection (defensive)
      }
    }
  }
}
