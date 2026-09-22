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
      List<Restaurant> restaurants = [];
      
      // If owner or platform admin, fetch all owned restaurants
      if (profile.isOwner || profile.isPlatformAdmin) {
        restaurants = await _remote.fetchOwnedRestaurants(profile.id);
      } else {
        // Just mock fetching the single restaurant from staff context for simplicity
        // Real app would fetch the specific restaurant details.
        // Assuming we always have at least one valid context if staff:
        if (staffContexts.isEmpty) {
          throw const PermissionFailure('No active restaurant assignments found.');
        }
      }

      // We need at least one restaurant
      if (restaurants.isEmpty && staffContexts.isEmpty) {
         throw const PermissionFailure('You don\'t have access to any restaurants.');
      }

      // For now, let's just pick the first available context or restaurant if nothing is saved
      final savedPrefs = await getSavedSelection();
      String? savedRestId = savedPrefs['restaurantId'];
      String? savedBranchId = savedPrefs['branchId'];
      
      Restaurant? selectedRestaurant;
      Branch? selectedBranch;
      String? effectiveRole;
      Map<String, bool> effectivePermissions = {};
      
      // Logic to determine the active restaurant and branch based on saved selection vs available list
      // ... (Simplified for this stub to always select the first valid one if not matching)
      
      // Placeholder return
      return AppContext(
        restaurants: restaurants,
        selectedRestaurant: restaurants.first,
        branches: [],
        selectedBranch: const Branch(id: 'stub', restaurantId: 'stub', name: 'Stub', isMainBranch: true, isActive: true),
        role: profile.role,
        permissions: {},
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
