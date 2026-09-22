part of 'live_order_board_cubit.dart';

abstract class LiveOrderBoardState extends Equatable {
  const LiveOrderBoardState();
  @override
  List<Object?> get props => [];
}

class LiveOrderBoardInitial extends LiveOrderBoardState {
  const LiveOrderBoardInitial();
}

class LiveOrderBoardLoading extends LiveOrderBoardState {
  const LiveOrderBoardLoading();
}

class LiveOrderBoardLoaded extends LiveOrderBoardState {
  final List<Order> orders;
  final bool isProcessing;
  final String? processingOrderId;

  const LiveOrderBoardLoaded({
    required this.orders,
    required this.isProcessing,
    this.processingOrderId,
  });

  List<Order> get awaitingWaiter => orders.where((o) => o.isInAwaitingColumn).toList();
  List<Order> get confirmed => orders.where((o) => o.isConfirmed).toList();
  List<Order> get inKitchen => orders.where((o) => o.isInKitchenColumn).toList();
  List<Order> get ready => orders.where((o) => o.isReady).toList();
  List<Order> get served => orders.where((o) => o.isServed).toList();

  LiveOrderBoardLoaded copyWith({
    List<Order>? orders,
    bool? isProcessing,
    String? processingOrderId,
  }) {
    return LiveOrderBoardLoaded(
      orders: orders ?? this.orders,
      isProcessing: isProcessing ?? this.isProcessing,
      processingOrderId: processingOrderId, // Can be null to clear
    );
  }

  @override
  List<Object?> get props => [orders, isProcessing, processingOrderId];
}

class LiveOrderBoardError extends LiveOrderBoardState {
  final String message;
  const LiveOrderBoardError(this.message);
  @override
  List<Object?> get props => [message];
}

class LiveOrderBoardActionError extends LiveOrderBoardLoaded {
  final String error;
  const LiveOrderBoardActionError({
    required super.orders,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [orders, error];
}
