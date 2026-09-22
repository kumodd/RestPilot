// ============================================================
// RestPilot — Core Error Types
// ============================================================

/// Base failure class — all domain-layer errors extend this.
abstract class Failure {
  final String message;
  final Object? cause;
  const Failure(this.message, {this.cause});
  @override
  String toString() => '$runtimeType: $message';
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message, {super.cause});
}

class AuthFailure extends Failure {
  const AuthFailure(super.message, {super.cause});
}

class ServerFailure extends Failure {
  final String? code;
  const ServerFailure(super.message, {this.code, super.cause});
}

class NotFoundFailure extends Failure {
  const NotFoundFailure(super.message, {super.cause});
}

class PermissionFailure extends Failure {
  const PermissionFailure(super.message, {super.cause});
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {super.cause});
}

class CacheFailure extends Failure {
  const CacheFailure(super.message, {super.cause});
}

/// App-level exception thrown by data sources, caught and mapped by repositories.
class AppException implements Exception {
  final String message;
  final String? code;
  const AppException(this.message, {this.code});
  @override
  String toString() => 'AppException[$code]: $message';
}
