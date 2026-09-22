part of 'auth_cubit.dart';

abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

/// OTP has been sent to [email] — show OTP entry screen.
class OtpSent extends AuthState {
  final String email;
  const OtpSent({required this.email});
  @override
  List<Object?> get props => [email];
}

class Authenticated extends AuthState {
  final UserProfile profile;
  const Authenticated(this.profile);
  @override
  List<Object?> get props => [profile];
}

class Unauthenticated extends AuthState {
  const Unauthenticated();
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
  @override
  List<Object?> get props => [message];
}
