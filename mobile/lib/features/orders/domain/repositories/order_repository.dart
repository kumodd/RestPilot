import '../entities/order.dart';

abstract class OrderRepository {
  Future<List<Order>> fetchLiveOrders(String branchId);
  Future<List<Order>> fetchKitchenOrders(String branchId);
  Future<List<Order>> fetchCashierOrders(String branchId);
  Future<void> transitionOrderStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  });
  Future<Map<String, dynamic>> processPayment({
    required String orderId,
    required String method,
    required double amount,
    String? externalReference,
  });
  Future<void> updateOrderItemStatus(String itemId, String newStatus);
}
