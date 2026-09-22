import '../../domain/entities/order.dart';
import '../../domain/repositories/order_repository.dart';
import '../datasources/order_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource _ds;
  const OrderRepositoryImpl(this._ds);

  @override
  Future<List<Order>> fetchLiveOrders(String branchId) async {
    try {
      return await _ds.fetchLiveOrders(branchId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw NetworkFailure('Failed to load orders', cause: e);
    }
  }

  @override
  Future<List<Order>> fetchKitchenOrders(String branchId) async {
    try {
      return await _ds.fetchKitchenOrders(branchId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw NetworkFailure('Failed to load kitchen orders', cause: e);
    }
  }

  @override
  Future<List<Order>> fetchCashierOrders(String branchId) async {
    try {
      return await _ds.fetchCashierOrders(branchId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw NetworkFailure('Failed to load cashier orders', cause: e);
    }
  }

  @override
  Future<void> transitionOrderStatus({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  }) async {
    try {
      await _ds.transitionOrderStatus(
        orderId: orderId,
        newStatus: newStatus,
        actorId: actorId,
        actorType: actorType,
      );
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to advance order status', cause: e);
    }
  }

  @override
  Future<Map<String, dynamic>> processPayment({
    required String orderId,
    required String method,
    required double amount,
    String? externalReference,
  }) async {
    try {
      return await _ds.processPayment(
        orderId: orderId,
        method: method,
        amount: amount,
        externalReference: externalReference,
      );
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Payment processing failed', cause: e);
    }
  }

  @override
  Future<void> updateOrderItemStatus(String itemId, String newStatus) async {
    try {
      await _ds.updateOrderItemStatus(itemId, newStatus);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to update item status', cause: e);
    }
  }
}
