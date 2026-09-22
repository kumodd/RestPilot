// ============================================================
// RestPilot — Context Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/utils/constants.dart';
import '../../domain/entities/app_context.dart';

abstract class ContextRemoteDataSource {
  Future<List<StaffContext>> fetchStaffContexts(String profileId);
  Future<List<Restaurant>> fetchOwnedRestaurants(String profileId);
  Future<List<Restaurant>> fetchStaffRestaurants(List<String> restaurantIds);
  Future<List<Branch>> fetchBranches(String restaurantId);
}

class ContextRemoteDataSourceImpl implements ContextRemoteDataSource {
  @override
  Future<List<StaffContext>> fetchStaffContexts(String profileId) async {
    final data = await withRetry(() => supabase
        .from('staff_members')
        .select('id, restaurant_id, branch_id, role, permissions, is_active')
        .eq('profile_id', profileId)
        .eq('is_active', true));

    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      return StaffContext(
        staffMemberId: map['id'] as String,
        restaurantId: map['restaurant_id'] as String,
        branchId: map['branch_id'] as String?,
        role: map['role'] as String,
        permissions: (map['permissions'] as Map<String, dynamic>?)
                ?.map((k, v) => MapEntry(k, v as bool)) ??
            {},
        isActive: map['is_active'] as bool? ?? true,
      );
    }).toList();
  }

  @override
  Future<List<Restaurant>> fetchOwnedRestaurants(String profileId) async {
    final data = await withRetry(() => supabase
        .from('restaurants')
        .select('''
          id, name, slug, logo_url, primary_color, secondary_color,
          currency, currency_symbol, is_active, is_accepting_orders,
          owners!inner(profile_id)
        ''')
        .eq('owners.profile_id', profileId)
        .eq('is_active', true));

    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      return Restaurant(
        id: map['id'] as String,
        name: map['name'] as String,
        slug: map['slug'] as String?,
        logoUrl: map['logo_url'] as String?,
        primaryColor: map['primary_color'] as String?,
        secondaryColor: map['secondary_color'] as String?,
        currency: map['currency'] as String? ?? 'INR',
        currencySymbol: map['currency_symbol'] as String? ?? '₹',
        isActive: map['is_active'] as bool? ?? true,
        isAcceptingOrders: map['is_accepting_orders'] as bool? ?? true,
      );
    }).toList();
  }

  @override
  Future<List<Restaurant>> fetchStaffRestaurants(List<String> restaurantIds) async {
    if (restaurantIds.isEmpty) return [];
    final data = await withRetry(() => supabase
        .from('restaurants')
        .select('id, name, slug, logo_url, primary_color, secondary_color, currency, currency_symbol, is_active, is_accepting_orders')
        .inFilter('id', restaurantIds)
        .eq('is_active', true));

    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      return Restaurant(
        id: map['id'] as String,
        name: map['name'] as String,
        slug: map['slug'] as String?,
        logoUrl: map['logo_url'] as String?,
        primaryColor: map['primary_color'] as String?,
        secondaryColor: map['secondary_color'] as String?,
        currency: map['currency'] as String? ?? 'INR',
        currencySymbol: map['currency_symbol'] as String? ?? '₹',
        isActive: map['is_active'] as bool? ?? true,
        isAcceptingOrders: map['is_accepting_orders'] as bool? ?? true,
      );
    }).toList();
  }

  @override
  Future<List<Branch>> fetchBranches(String restaurantId) async {
    final data = await withRetry(() => supabase
        .from('branches')
        .select('id, restaurant_id, name, address, city, is_main_branch, is_active')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true));

    return (data as List).map((e) {
      final map = e as Map<String, dynamic>;
      return Branch(
        id: map['id'] as String,
        restaurantId: map['restaurant_id'] as String,
        name: map['name'] as String,
        address: map['address'] as String?,
        city: map['city'] as String?,
        isMainBranch: map['is_main_branch'] as bool? ?? false,
        isActive: map['is_active'] as bool? ?? true,
      );
    }).toList();
  }
}
