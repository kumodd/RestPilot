import '../repositories/order_repository.dart';

class TransitionOrderStatus {
  final OrderRepository _repo;
  const TransitionOrderStatus(this._repo);

  Future<void> call({
    required String orderId,
    required String newStatus,
    required String actorId,
    required String actorType,
  }) =>
      _repo.transitionOrderStatus(
        orderId: orderId,
        newStatus: newStatus,
        actorId: actorId,
        actorType: actorType,
      );
}
