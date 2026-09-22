// ============================================================
// RestPilot — Tables Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';
import '../../../../core/utils/constants.dart';

class RestaurantTable extends Equatable {
  final String id;
  final String restaurantId;
  final String branchId;
  final String tableNumber;
  final String? displayName;
  final int capacity;
  final String status; // table_status enum: 'available', 'ordering', 'order_active', 'ready_to_serve', 'bill_requested', 'cleaning'
  final String qrToken;
  final bool isActive;
  final String? createdAt;

  const RestaurantTable({
    required this.id,
    required this.restaurantId,
    required this.branchId,
    required this.tableNumber,
    this.displayName,
    required this.capacity,
    required this.status,
    required this.qrToken,
    required this.isActive,
    this.createdAt,
  });

  String get label => displayName ?? 'Table $tableNumber';

  /// Generates the full QR URL
  String getQrUrl(String baseUrl) => AppConstants.qrUrl(baseUrl, qrToken);

  @override
  List<Object?> get props => [id, tableNumber, status, qrToken, isActive];
}
