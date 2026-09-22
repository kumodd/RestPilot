// ============================================================
// RestPilot — Context Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';

class Restaurant extends Equatable {
  final String id;
  final String name;
  final String? slug;
  final String? logoUrl;
  final String? primaryColor;
  final String? secondaryColor;
  final String currency;
  final String currencySymbol;
  final String subscriptionTier;
  final bool isActive;
  final bool isAcceptingOrders;

  const Restaurant({
    required this.id,
    required this.name,
    this.slug,
    this.logoUrl,
    this.primaryColor,
    this.secondaryColor,
    this.currency = 'INR',
    this.currencySymbol = '₹',
    this.subscriptionTier = 'free',
    required this.isActive,
    required this.isAcceptingOrders,
  });

  @override
  List<Object?> get props => [id, name, slug];
}

class Branch extends Equatable {
  final String id;
  final String restaurantId;
  final String name;
  final String? address;
  final String? city;
  final bool isMainBranch;
  final bool isActive;

  const Branch({
    required this.id,
    required this.restaurantId,
    required this.name,
    this.address,
    this.city,
    required this.isMainBranch,
    required this.isActive,
  });

  @override
  List<Object?> get props => [id, restaurantId, name];
}

class StaffContext extends Equatable {
  final String staffMemberId;
  final String restaurantId;
  final String? branchId;
  final String role;
  final Map<String, bool> permissions;
  final bool isActive;

  const StaffContext({
    required this.staffMemberId,
    required this.restaurantId,
    this.branchId,
    required this.role,
    required this.permissions,
    required this.isActive,
  });

  bool hasPermission(String key) => permissions[key] == true;

  @override
  List<Object?> get props => [staffMemberId, restaurantId, branchId, role];
}

/// Full user context after restaurant + branch selection
class AppContext extends Equatable {
  final List<Restaurant> restaurants;
  final Restaurant selectedRestaurant;
  final List<Branch> branches;
  final Branch selectedBranch;
  final String role; // effective role for this restaurant context
  final Map<String, bool> permissions;

  const AppContext({
    required this.restaurants,
    required this.selectedRestaurant,
    required this.branches,
    required this.selectedBranch,
    required this.role,
    required this.permissions,
  });

  AppContext copyWith({
    List<Restaurant>? restaurants,
    Restaurant? selectedRestaurant,
    List<Branch>? branches,
    Branch? selectedBranch,
    String? role,
    Map<String, bool>? permissions,
  }) {
    return AppContext(
      restaurants: restaurants ?? this.restaurants,
      selectedRestaurant: selectedRestaurant ?? this.selectedRestaurant,
      branches: branches ?? this.branches,
      selectedBranch: selectedBranch ?? this.selectedBranch,
      role: role ?? this.role,
      permissions: permissions ?? this.permissions,
    );
  }

  bool hasPermission(String key) => permissions[key] == true;

  bool get isPlatformAdmin => role == 'platform_admin';
  bool get isOwner => role == 'owner';
  bool get isManager => role == 'manager';
  bool get isWaiter => role == 'waiter';
  bool get isChef => role == 'chef';
  bool get isKitchenManager => role == 'kitchen_manager';
  bool get isCashier => role == 'cashier';

  bool get canViewOrders => hasPermission('view_orders') || isOwner || isPlatformAdmin;
  bool get canConfirmOrders => hasPermission('confirm_orders') || isOwner || isPlatformAdmin;
  bool get canAdvanceStatus => hasPermission('advance_status') || isOwner || isPlatformAdmin;
  bool get canCancelOrders => hasPermission('cancel_orders') || isOwner || isPlatformAdmin;
  bool get canViewMenu => hasPermission('view_menu') || isOwner || isPlatformAdmin;
  bool get canEditMenu => hasPermission('edit_menu') || isOwner || isPlatformAdmin;
  bool get canManageMenu => hasPermission('manage_menu') || isOwner || isPlatformAdmin;
  bool get canViewTables => hasPermission('view_tables') || isOwner || isPlatformAdmin;
  bool get canManageTables => hasPermission('manage_tables') || isOwner || isPlatformAdmin;
  bool get canViewStaff => hasPermission('view_staff') || isOwner || isPlatformAdmin;
  bool get canManageStaff => hasPermission('manage_staff') || isOwner || isPlatformAdmin;
  bool get canViewSettings => hasPermission('view_settings') || isOwner || isPlatformAdmin;
  bool get canEditSettings => hasPermission('edit_settings') || isOwner || isPlatformAdmin;
  bool get canViewReports => hasPermission('view_reports') || isOwner || isPlatformAdmin;
  bool get canKitchenDisplay => hasPermission('kitchen_display') || isOwner || isPlatformAdmin;

  @override
  List<Object?> get props => [selectedRestaurant.id, selectedBranch.id, role];
}
