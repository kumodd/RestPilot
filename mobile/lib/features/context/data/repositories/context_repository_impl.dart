// ============================================================
// RestPilot — Context Repository Impl
// ============================================================

import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/utils/constants.dart';
import '../../../auth/domain/entities/user_profile.dart';
import '../../domain/entities/app_context.dart';
import '../../domain/repositories/context_repository.dart';
import '../datasources/context_remote_datasource.dart';

class ContextRepositoryImpl implements ContextRepository {
  final ContextRemoteDataSource _remote;
  final SharedPreferences _prefs;

  const ContextRepositoryImpl(this._remote, this._prefs);

  @override
  Future<AppContext> loadContext({required UserProfile profile}) async {
    try {
      final staffContexts = await _remote.fetchStaffContexts(profile.id);
      final restaurants = (profile.isOwner || profile.isPlatformAdmin)
          ? await _remote.fetchOwnedRestaurants(profile.id)
          : await _remote.fetchStaffRestaurants(
              staffContexts.map((context) => context.restaurantId).toSet().toList(),
            );

      if (restaurants.isEmpty) {
        throw const PermissionFailure('You don\'t have access to any active restaurants.');
      }

      // Load every branch the user can see. Branch-scoped staff assignments
      // are filtered after loading so a multi-restaurant account is handled
      // without falling back to a fake branch.
      final allBranches = <Branch>[];
      for (final restaurant in restaurants) {
        final branches = await _remote.fetchBranches(restaurant.id);
        allBranches.addAll(branches);
      }

      final savedPrefs = await getSavedSelection();
      String? savedRestId = savedPrefs['restaurantId'];
      String? savedBranchId = savedPrefs['branchId'];

      final selectedRestaurant = restaurants.firstWhere(
        (restaurant) => restaurant.id == savedRestId,
        orElse: () => restaurants.first,
      );
      final selectedStaffContext = staffContexts.cast<StaffContext?>().firstWhere(
        (context) => context?.restaurantId == selectedRestaurant.id,
        orElse: () => null,
      );
      final assignedBranchId = selectedStaffContext?.branchId;
      final availableBranches = allBranches.where((branch) {
        if (branch.restaurantId != selectedRestaurant.id) return false;
        return assignedBranchId == null || branch.id == assignedBranchId;
      }).toList();

      if (availableBranches.isEmpty) {
        throw const PermissionFailure('No active branches found for the selected restaurant.');
      }

      final selectedBranch = availableBranches.firstWhere(
        (branch) => branch.id == savedBranchId,
        orElse: () => availableBranches.firstWhere(
          (branch) => branch.id == assignedBranchId,
          orElse: () => availableBranches.firstWhere(
            (branch) => branch.isMainBranch,
            orElse: () => availableBranches.first,
          ),
        ),
      );

      return AppContext(
        restaurants: restaurants,
        selectedRestaurant: selectedRestaurant,
        branches: allBranches,
        selectedBranch: selectedBranch,
        role: selectedStaffContext?.role ?? profile.role,
        permissions: selectedStaffContext?.permissions ?? {},
      );

    } catch (e) {
      if (e is Failure) rethrow;
      throw ServerFailure('Failed to load context', cause: e);
    }
  }

  @override
  Future<void> saveSelection({
    required String restaurantId,
    required String branchId,
    required String role,
  }) async {
    await _prefs.setString(AppConstants.prefSelectedRestaurantId, restaurantId);
    await _prefs.setString(AppConstants.prefSelectedBranchId, branchId);
    await _prefs.setString(AppConstants.prefSelectedRole, role);
  }

  @override
  Future<Map<String, String?>> getSavedSelection() async {
    return {
      'restaurantId': _prefs.getString(AppConstants.prefSelectedRestaurantId),
      'branchId': _prefs.getString(AppConstants.prefSelectedBranchId),
      'role': _prefs.getString(AppConstants.prefSelectedRole),
    };
  }
}
