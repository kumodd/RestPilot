// ============================================================
// RestPilot — Menu Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';

class MenuCategory extends Equatable {
  final String id;
  final String restaurantId;
  final String name;
  final String? description;
  final int sortOrder;
  final bool isActive;
  final List<MenuItem> items;

  const MenuCategory({
    required this.id,
    required this.restaurantId,
    required this.name,
    this.description,
    required this.sortOrder,
    required this.isActive,
    this.items = const [],
  });

  @override
  List<Object?> get props => [id, name, sortOrder, isActive, items];
}

class MenuItem extends Equatable {
  final String id;
  final String categoryId;
  final String restaurantId;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final String? dietaryLabel;
  final int sortOrder;
  final bool isAvailable; // Controls live ordering
  final bool isActive; // Controls visibility in management

  const MenuItem({
    required this.id,
    required this.categoryId,
    required this.restaurantId,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    this.dietaryLabel,
    required this.sortOrder,
    required this.isAvailable,
    required this.isActive,
  });

  @override
  List<Object?> get props => [id, name, price, isAvailable, isActive];
}
