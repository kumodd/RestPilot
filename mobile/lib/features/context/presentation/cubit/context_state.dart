part of 'context_cubit.dart';

abstract class ContextState extends Equatable {
  const ContextState();
  @override
  List<Object?> get props => [];
}

class ContextInitial extends ContextState {
  const ContextInitial();
}

class ContextLoading extends ContextState {
  const ContextLoading();
}

class ContextLoaded extends ContextState {
  final AppContext context;
  const ContextLoaded(this.context);
  @override
  List<Object?> get props => [context];
}

class ContextError extends ContextState {
  final String message;
  const ContextError(this.message);
  @override
  List<Object?> get props => [message];
}
