import '../entities/app_context.dart';
import '../../../auth/domain/entities/user_profile.dart';

abstract class ContextRepository {
  Future<AppContext> loadContext({required UserProfile profile});
  Future<void> saveSelection({required String restaurantId, required String branchId, required String role});
  Future<Map<String, String?>> getSavedSelection();
}
