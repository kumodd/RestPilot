import '../repositories/order_repository.dart';
import '../entities/order.dart';

class FetchLiveOrders {
  final OrderRepository _repo;
  const FetchLiveOrders(this._repo);
  Future<List<Order>> call(String branchId) => _repo.fetchLiveOrders(branchId);
}

class FetchKitchenOrders {
  final OrderRepository _repo;
  const FetchKitchenOrders(this._repo);
  Future<List<Order>> call(String branchId) => _repo.fetchKitchenOrders(branchId);
}

class FetchCashierOrders {
  final OrderRepository _repo;
  const FetchCashierOrders(this._repo);
  Future<List<Order>> call(String branchId) => _repo.fetchCashierOrders(branchId);
}
