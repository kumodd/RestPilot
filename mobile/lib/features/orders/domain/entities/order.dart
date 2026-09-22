// ============================================================
// RestPilot — Order Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';

class OrderItem extends Equatable {
  final String id;
  final String orderId;
  final String itemNameSnapshot;
  final String? itemDescriptionSnapshot;
  final double unitPriceSnapshot;
  final int quantity;
  final double lineTotal;
  final String status; // item_status enum
  final String? specialInstructions;
  final String? kitchenStation;
  final String addedByActorType;

  const OrderItem({
    required this.id,
    required this.orderId,
    required this.itemNameSnapshot,
    this.itemDescriptionSnapshot,
    required this.unitPriceSnapshot,
    required this.quantity,
    required this.lineTotal,
    required this.status,
    this.specialInstructions,
    this.kitchenStation,
    required this.addedByActorType,
  });

  bool get isPending => status == 'pending';
  bool get isReady => status == 'ready';
  bool get isPreparing => status == 'preparing';
  bool get isCancelled => status == 'cancelled';

  @override
  List<Object?> get props => [id, orderId, status, quantity];
}

class OrderTableInfo extends Equatable {
  final String tableNumber;
  final String? displayName;

  const OrderTableInfo({required this.tableNumber, this.displayName});

  String get label => displayName ?? 'Table $tableNumber';

  @override
  List<Object?> get props => [tableNumber, displayName];
}

class PaymentInfo extends Equatable {
  final double amount;
  final String? method;
  final String status;
  final String? createdAt;

  const PaymentInfo({
    required this.amount,
    this.method,
    required this.status,
    this.createdAt,
  });

  @override
  List<Object?> get props => [amount, method, status];
}

class Order extends Equatable {
  final String id;
  final String restaurantId;
  final String branchId;
  final int orderNumber;
  final String status; // order_status enum
  final String? customerNameSnapshot;
  final String? customerPhoneSnapshot;
  final String? customerNotes;
  final double subtotal;
  final double tax;
  final double serviceCharge;
  final double discount;
  final double total;
  final String? placedAt;
  final String? confirmedAt;
  final String? kitchenAcceptedAt;
  final String? preparingStartedAt;
  final String? readyAt;
  final String? servedAt;
  final String? completedAt;
  final String? cancelledAt;
  final OrderTableInfo? table;
  final List<OrderItem> items;
  final List<PaymentInfo> payments;

  const Order({
    required this.id,
    required this.restaurantId,
    required this.branchId,
    required this.orderNumber,
    required this.status,
    this.customerNameSnapshot,
    this.customerPhoneSnapshot,
    this.customerNotes,
    required this.subtotal,
    required this.tax,
    required this.serviceCharge,
    required this.discount,
    required this.total,
    this.placedAt,
    this.confirmedAt,
    this.kitchenAcceptedAt,
    this.preparingStartedAt,
    this.readyAt,
    this.servedAt,
    this.completedAt,
    this.cancelledAt,
    this.table,
    required this.items,
    required this.payments,
  });

  // Convenience status groups
  bool get isPlaced => status == 'placed';
  bool get isAwaitingWaiter => status == 'awaiting_waiter_verification';
  bool get isWaiterReviewing => status == 'waiter_reviewing';
  bool get isConfirmed => status == 'confirmed';
  bool get isKitchenAccepted => status == 'kitchen_accepted';
  bool get isPreparing => status == 'preparing';
  bool get isReady => status == 'ready';
  bool get isServed => status == 'served';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled' || status == 'rejected';
  bool get isPaid => payments.any((p) => p.status == 'paid');

  bool get isInAwaitingColumn =>
      ['placed', 'awaiting_waiter_verification', 'waiter_reviewing'].contains(status);
  bool get isInKitchenColumn =>
      ['kitchen_accepted', 'preparing'].contains(status);

  /// The relevant timestamp for urgency calculation
  DateTime? get urgencyFrom {
    if (placedAt != null) return DateTime.tryParse(placedAt!)?.toLocal();
    return null;
  }

  int get elapsedMinutes {
    final from = urgencyFrom;
    if (from == null) return 0;
    return DateTime.now().difference(from).inMinutes;
  }

  @override
  List<Object?> get props => [id, status, orderNumber];
}
