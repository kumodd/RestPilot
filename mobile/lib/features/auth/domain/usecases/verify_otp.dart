// Stub files to satisfy imports — implementations follow in their respective files
import '../repositories/auth_repository.dart';
import '../entities/user_profile.dart';
export 'sign_in_with_otp.dart';

class VerifyOtp {
  final AuthRepository _repo;
  const VerifyOtp(this._repo);
  Future<UserProfile> call({required String email, required String token}) =>
      _repo.verifyOtp(email: email, token: token);
}
