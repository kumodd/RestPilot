import '../../../../core/realtime/realtime_manager.dart';
import '../repositories/auth_repository.dart';
import '../entities/user_profile.dart';

class SignOut {
  final AuthRepository _repo;
  final RealtimeManager _realtime;
  const SignOut(this._repo, this._realtime);
  Future<void> call() async {
    await _realtime.disposeAll();
    await _repo.signOut();
  }
}
