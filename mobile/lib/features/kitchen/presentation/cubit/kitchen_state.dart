part of 'kitchen_cubit.dart';

abstract class KitchenState extends Equatable {
  const KitchenState();
  @override
  List<Object?> get props => [];
}

class KitchenInitial extends KitchenState {
  const KitchenInitial();
}

class KitchenLoading extends KitchenState {
  const KitchenLoading();
}

class KitchenLoaded extends KitchenState {
  final List<Order> orders;
  final bool isProcessing;
  final String? processingOrderId;

  const KitchenLoaded({
    required this.orders,
    required this.isProcessing,
    this.processingOrderId,
  });

  KitchenLoaded copyWith({
    List<Order>? orders,
    bool? isProcessing,
    String? processingOrderId,
  }) {
    return KitchenLoaded(
      orders: orders ?? this.orders,
      isProcessing: isProcessing ?? this.isProcessing,
      processingOrderId: processingOrderId,
    );
  }

  @override
  List<Object?> get props => [orders, isProcessing, processingOrderId];
}

class KitchenError extends KitchenState {
  final String message;
  const KitchenError(this.message);
  @override
  List<Object?> get props => [message];
}

class KitchenActionError extends KitchenLoaded {
  final String error;
  const KitchenActionError({
    required super.orders,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [orders, error];
}
