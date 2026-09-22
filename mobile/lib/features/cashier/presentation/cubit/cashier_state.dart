part of 'cashier_cubit.dart';

abstract class CashierState extends Equatable {
  const CashierState();
  @override
  List<Object?> get props => [];
}

class CashierInitial extends CashierState {
  const CashierInitial();
}

class CashierLoading extends CashierState {
  const CashierLoading();
}

class CashierLoaded extends CashierState {
  final List<Order> orders;
  final bool isProcessing;
  final String? processingOrderId;

  const CashierLoaded({
    required this.orders,
    required this.isProcessing,
    this.processingOrderId,
  });

  List<Order> get ready => orders.where((o) => o.status == 'ready' || o.status == 'served').toList();
  List<Order> get completed => orders.where((o) => o.status == 'completed').toList();

  CashierLoaded copyWith({
    List<Order>? orders,
    bool? isProcessing,
    String? processingOrderId,
  }) {
    return CashierLoaded(
      orders: orders ?? this.orders,
      isProcessing: isProcessing ?? this.isProcessing,
      processingOrderId: processingOrderId, // Can be null to clear
    );
  }

  @override
  List<Object?> get props => [orders, isProcessing, processingOrderId];
}

class CashierError extends CashierState {
  final String message;
  const CashierError(this.message);
  @override
  List<Object?> get props => [message];
}

class CashierActionError extends CashierLoaded {
  final String error;
  const CashierActionError({
    required super.orders,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [orders, error];
}
