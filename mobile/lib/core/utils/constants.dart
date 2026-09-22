// ============================================================
// RestPilot — App Constants
// ============================================================

class AppConstants {
  AppConstants._();

  // Realtime channel names (must match web app convention)
  static String liveOrdersChannel(String branchId) => 'live-orders-$branchId';
  static String kdsChannel(String branchId) => 'kds-$branchId';
  static String cashierChannel(String branchId) => 'cashier-$branchId';
  static String notificationsChannel(String userId) => 'notifications-$userId';
  static String tablesChannel(String branchId) => 'tables-$branchId';

  // QR URL format
  static String qrUrl(String webUrl, String token) => '$webUrl/t/$token';

  // Invite URL — redirect through web page as decided
  static String inviteUrl(String webUrl, String token) =>
      '$webUrl/auth/accept-invite?token=$token';

  // Order urgency thresholds (minutes, matches web)
  static const int orderUrgencyWarningMinutes = 20;
  static const int kdsUrgencyWarningMinutes = 15;
  static const int kdsUrgencyCriticalMinutes = 25;

  // Retry policy
  static const int maxRetryAttempts = 3;
  static const Duration retryBaseDelay = Duration(milliseconds: 200);

  // Pagination
  static const int ordersPageSize = 50;
  static const int notificationsPageSize = 50;

  // Permissions (matches web StaffPageClient.tsx exactly)
  static const List<String> managerPermissions = [
    'view_orders', 'confirm_orders', 'advance_status', 'cancel_orders', 'add_items',
    'view_menu', 'edit_menu', 'toggle_availability',
    'view_tables', 'manage_tables',
    'view_staff', 'manage_staff',
    'view_reports', 'export_reports',
    'view_settings', 'edit_settings',
    'kitchen_display', 'mark_item_ready',
  ];
  static const List<String> waiterPermissions = [
    'view_orders', 'confirm_orders', 'add_items', 'view_menu', 'view_tables',
  ];
  static const List<String> chefPermissions = [
    'view_orders', 'advance_status', 'view_menu', 'kitchen_display', 'mark_item_ready',
  ];
  static const List<String> kitchenManagerPermissions = [
    'view_orders', 'advance_status', 'view_menu', 'toggle_availability',
    'kitchen_display', 'mark_item_ready',
  ];
  static const List<String> cashierPermissions = [
    'view_orders', 'view_menu', 'view_reports',
  ];

  static List<String> defaultPermissionsForRole(String role) {
    switch (role) {
      case 'manager': return managerPermissions;
      case 'waiter': return waiterPermissions;
      case 'chef': return chefPermissions;
      case 'kitchen_manager': return kitchenManagerPermissions;
      case 'cashier': return cashierPermissions;
      default: return [];
    }
  }

  // SharedPreferences keys
  static const String prefSelectedRestaurantId = 'selected_restaurant_id';
  static const String prefSelectedBranchId = 'selected_branch_id';
  static const String prefSelectedRole = 'selected_role';
}

// ============================================================
// Order Status Groups (matches web board columns exactly)
// ============================================================
class OrderStatusGroups {
  OrderStatusGroups._();

  static const awaitingWaiter = [
    'placed',
    'awaiting_waiter_verification',
    'waiter_reviewing',
  ];
  static const confirmed = ['confirmed'];
  static const inKitchen = ['kitchen_accepted', 'preparing'];
  static const ready = ['ready'];
  static const served = ['served'];
  static const completed = ['completed'];
  static const cancelled = ['cancelled', 'rejected'];

  // Statuses shown on Live Order Board (all active)
  static const activeBoardStatuses = [
    'placed',
    'awaiting_waiter_verification',
    'waiter_reviewing',
    'confirmed',
    'kitchen_accepted',
    'preparing',
    'ready',
    'served',
  ];

  // Statuses shown on KDS
  static const kdsStatuses = [
    'confirmed',
    'kitchen_accepted',
    'preparing',
    'ready',
  ];

  // Statuses shown on Cashier
  static const cashierStatuses = ['ready', 'served', 'completed'];
}

// ============================================================
// Role Configuration (matches web StaffPageClient.tsx)
// ============================================================
class RoleConfig {
  final String label;
  final int color;
  final String icon;
  const RoleConfig({required this.label, required this.color, required this.icon});
}

const Map<String, RoleConfig> kRoleConfig = {
  'platform_admin': RoleConfig(label: 'Platform Admin', color: 0xFFEF4444, icon: '🛡️'),
  'owner':          RoleConfig(label: 'Owner',          color: 0xFFF59E0B, icon: '👑'),
  'manager':        RoleConfig(label: 'Manager',        color: 0xFF8B5CF6, icon: '👔'),
  'waiter':         RoleConfig(label: 'Waiter',         color: 0xFF3B82F6, icon: '🛎️'),
  'chef':           RoleConfig(label: 'Chef',           color: 0xFFFF6B35, icon: '👨‍🍳'),
  'kitchen_manager':RoleConfig(label: 'Kitchen Mgr',   color: 0xFFF59E0B, icon: '🍳'),
  'cashier':        RoleConfig(label: 'Cashier',        color: 0xFF22C55E, icon: '💵'),
};

// ============================================================
// Table Status Colors (matches web TABLE_STATUS_CONFIG)
// ============================================================
const Map<String, Map<String, dynamic>> kTableStatusConfig = {
  'available':      {'label': 'Available',       'color': 0xFF22C55E},
  'ordering':       {'label': 'Ordering',        'color': 0xFF3B82F6},
  'order_active':   {'label': 'Order Active',    'color': 0xFFF59E0B},
  'ready_to_serve': {'label': 'Ready to Serve',  'color': 0xFF8B5CF6},
  'bill_requested': {'label': 'Bill Requested',  'color': 0xFFEF4444},
  'cleaning':       {'label': 'Cleaning',        'color': 0xFF737373},
};

// ============================================================
// Dietary Labels (matches web DIETARY_LABELS)
// ============================================================
const Map<String, Map<String, String>> kDietaryLabels = {
  'veg':         {'label': 'Veg',         'icon': '🟢'},
  'non_veg':     {'label': 'Non-Veg',     'icon': '🔴'},
  'vegan':       {'label': 'Vegan',       'icon': '🟢'},
  'gluten_free': {'label': 'Gluten Free', 'icon': '🌾'},
  'dairy_free':  {'label': 'Dairy Free',  'icon': '🥛'},
  'jain':        {'label': 'Jain',        'icon': '🔵'},
  'halal':       {'label': 'Halal',       'icon': '☪️'},
  'kosher':      {'label': 'Kosher',      'icon': '✡️'},
};
