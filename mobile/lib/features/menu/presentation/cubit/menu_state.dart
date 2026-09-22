part of 'menu_cubit.dart';

abstract class MenuState extends Equatable {
  const MenuState();
  @override
  List<Object?> get props => [];
}

class MenuInitial extends MenuState {
  const MenuInitial();
}

class MenuLoading extends MenuState {
  const MenuLoading();
}

class MenuLoaded extends MenuState {
  final List<MenuCategory> categories;
  final bool isProcessing;

  const MenuLoaded({
    required this.categories,
    required this.isProcessing,
  });

  MenuLoaded copyWith({
    List<MenuCategory>? categories,
    bool? isProcessing,
  }) {
    return MenuLoaded(
      categories: categories ?? this.categories,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }

  @override
  List<Object?> get props => [categories, isProcessing];
}

class MenuError extends MenuState {
  final String message;
  const MenuError(this.message);
  @override
  List<Object?> get props => [message];
}

class MenuActionError extends MenuLoaded {
  final String error;
  const MenuActionError({
    required super.categories,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [categories, error];
}
