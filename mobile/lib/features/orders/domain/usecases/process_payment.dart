import '../repositories/order_repository.dart';

class ProcessPayment {
  final OrderRepository _repo;
  const ProcessPayment(this._repo);

  Future<Map<String, dynamic>> call({
    required String orderId,
    required String method, // 'cash' | 'card' | 'upi'
    required double amount,
    String? externalReference,
  }) =>
      _repo.processPayment(
        orderId: orderId,
        method: method,
        amount: amount,
        externalReference: externalReference,
      );
}
