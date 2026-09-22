// ============================================================
// RestPilot — AuthCubit
// ============================================================

import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/user_profile.dart';
import '../../domain/usecases/sign_in_with_otp.dart';
import '../../domain/usecases/verify_otp.dart';
import '../../domain/usecases/sign_out.dart';
import '../../domain/usecases/get_current_user.dart';
import '../../../../core/errors/failures.dart';

part 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final SignInWithOtp _signInWithOtp;
  final VerifyOtp _verifyOtp;
  final SignOut _signOut;
  final GetCurrentUser _getCurrentUser;

  AuthCubit({
    required SignInWithOtp signInWithOtp,
    required VerifyOtp verifyOtp,
    required SignOut signOut,
    required GetCurrentUser getCurrentUser,
  })  : _signInWithOtp = signInWithOtp,
        _verifyOtp = verifyOtp,
        _signOut = signOut,
        _getCurrentUser = getCurrentUser,
        super(const AuthInitial());

  /// Check current session on app start.
  Future<void> checkAuthStatus() async {
    emit(const AuthLoading());
    try {
      final profile = await _getCurrentUser();
      if (profile != null && profile.isActive) {
        emit(Authenticated(profile));
      } else {
        emit(const Unauthenticated());
      }
    } catch (_) {
      emit(const Unauthenticated());
    }
  }

  /// Send OTP to [email]. Transitions to [OtpSent] state.
  Future<void> sendOtp(String email) async {
    emit(const AuthLoading());
    try {
      await _signInWithOtp(email.trim().toLowerCase());
      emit(OtpSent(email: email.trim().toLowerCase()));
    } on AuthFailure catch (e) {
      emit(AuthError(e.message));
    } on Failure catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  /// Verify the OTP token.
  Future<void> verifyOtp({required String email, required String token}) async {
    emit(const AuthLoading());
    try {
      final profile = await _verifyOtp(email: email, token: token);
      if (!profile.isActive) {
        emit(const AuthError('Your account has been deactivated. Contact your manager.'));
        return;
      }
      emit(Authenticated(profile));
    } on AuthFailure catch (e) {
      emit(AuthError(e.message));
    } on Failure catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  /// Sign out. RealtimeManager.disposeAll() is called inside [SignOut] use case.
  Future<void> signOut() async {
    try {
      await _signOut();
    } catch (_) {}
    emit(const Unauthenticated());
  }
}
