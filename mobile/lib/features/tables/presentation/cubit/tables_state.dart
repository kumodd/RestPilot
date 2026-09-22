part of 'tables_cubit.dart';

abstract class TablesState extends Equatable {
  const TablesState();
  @override
  List<Object?> get props => [];
}

class TablesInitial extends TablesState {
  const TablesInitial();
}

class TablesLoading extends TablesState {
  const TablesLoading();
}

class TablesLoaded extends TablesState {
  final List<RestaurantTable> tables;
  final bool isProcessing;

  const TablesLoaded({
    required this.tables,
    required this.isProcessing,
  });

  TablesLoaded copyWith({
    List<RestaurantTable>? tables,
    bool? isProcessing,
  }) {
    return TablesLoaded(
      tables: tables ?? this.tables,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }

  @override
  List<Object?> get props => [tables, isProcessing];
}

class TablesError extends TablesState {
  final String message;
  const TablesError(this.message);
  @override
  List<Object?> get props => [message];
}

class TablesActionError extends TablesLoaded {
  final String error;
  const TablesActionError({
    required super.tables,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [tables, error];
}
