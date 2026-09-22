import '../repositories/auth_repository.dart';
import '../entities/user_profile.dart';

class GetCurrentUser {
  final AuthRepository _repo;
  const GetCurrentUser(this._repo);
  Future<UserProfile?> call() => _repo.getCurrentUser();
}
