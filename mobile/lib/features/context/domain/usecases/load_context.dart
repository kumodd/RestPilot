import '../repositories/context_repository.dart';
import '../entities/app_context.dart';
import '../../../auth/domain/entities/user_profile.dart';

class LoadContext {
  final ContextRepository _repo;
  const LoadContext(this._repo);
  Future<AppContext> call({required UserProfile profile}) =>
      _repo.loadContext(profile: profile);
}
