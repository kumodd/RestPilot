// ============================================================
// RestPilot — Dependency Injection (GetIt)
// ============================================================

import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../realtime/realtime_manager.dart';

// Auth
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/sign_in_with_otp.dart';
import '../../features/auth/domain/usecases/verify_otp.dart';
import '../../features/auth/domain/usecases/sign_out.dart';
import '../../features/auth/domain/usecases/get_current_user.dart';
import '../../features/auth/presentation/cubit/auth_cubit.dart';

// Context
import '../../features/context/data/datasources/context_remote_datasource.dart';
import '../../features/context/data/repositories/context_repository_impl.dart';
import '../../features/context/domain/repositories/context_repository.dart';
import '../../features/context/domain/usecases/load_context.dart';
import '../../features/context/presentation/cubit/context_cubit.dart';

// Orders (shared)
import '../../features/orders/data/datasources/order_remote_datasource.dart';
import '../../features/orders/data/repositories/order_repository_impl.dart';
import '../../features/orders/domain/repositories/order_repository.dart';
import '../../features/orders/domain/usecases/fetch_live_orders.dart';
import '../../features/orders/domain/usecases/transition_order_status.dart';
import '../../features/orders/domain/usecases/process_payment.dart';
import '../../features/live_order_board/presentation/cubit/live_order_board_cubit.dart';
import '../../features/kitchen/presentation/cubit/kitchen_cubit.dart';
import '../../features/cashier/presentation/cubit/cashier_cubit.dart';

// Tables
import '../../features/tables/data/datasources/tables_remote_datasource.dart';
import '../../features/tables/data/repositories/tables_repository_impl.dart';
import '../../features/tables/domain/repositories/tables_repository.dart';
import '../../features/tables/domain/usecases/fetch_tables.dart';
import '../../features/tables/domain/usecases/add_table.dart';
import '../../features/tables/domain/usecases/generate_qr_code.dart';
import '../../features/tables/presentation/cubit/tables_cubit.dart';

// Menu
import '../../features/menu/data/datasources/menu_remote_datasource.dart';
import '../../features/menu/data/repositories/menu_repository_impl.dart';
import '../../features/menu/domain/repositories/menu_repository.dart';
import '../../features/menu/domain/usecases/fetch_menu.dart';
import '../../features/menu/domain/usecases/save_category.dart';
import '../../features/menu/domain/usecases/save_menu_item.dart';
import '../../features/menu/domain/usecases/toggle_availability.dart';
import '../../features/menu/domain/usecases/delete_category.dart';
import '../../features/menu/domain/usecases/delete_menu_item.dart';
import '../../features/menu/presentation/cubit/menu_cubit.dart';

// Staff
import '../../features/staff/data/datasources/staff_remote_datasource.dart';
import '../../features/staff/data/repositories/staff_repository_impl.dart';
import '../../features/staff/domain/repositories/staff_repository.dart';
import '../../features/staff/domain/usecases/fetch_staff.dart';
import '../../features/staff/domain/usecases/invite_staff.dart';
import '../../features/staff/domain/usecases/update_permissions.dart';
import '../../features/staff/domain/usecases/toggle_staff_active.dart';
import '../../features/staff/domain/usecases/fetch_invitations.dart';
import '../../features/staff/presentation/cubit/staff_cubit.dart';

// Settings
// import '../../features/settings/data/datasources/settings_remote_datasource.dart';
// import '../../features/settings/data/repositories/settings_repository_impl.dart';
// import '../../features/settings/domain/repositories/settings_repository.dart';
// import '../../features/settings/domain/usecases/fetch_settings.dart';
// import '../../features/settings/domain/usecases/save_settings.dart';

// Notifications
import '../../features/notifications/data/datasources/notifications_remote_datasource.dart';
import '../../features/notifications/data/repositories/notifications_repository_impl.dart';
import '../../features/notifications/domain/repositories/notifications_repository.dart';
import '../../features/notifications/domain/usecases/fetch_notifications.dart';
import '../../features/notifications/domain/usecases/mark_notification_read.dart';
import '../../features/notifications/presentation/cubit/notifications_cubit.dart';

// Admin
// import '../../features/admin/data/datasources/admin_remote_datasource.dart';
// import '../../features/admin/data/repositories/admin_repository_impl.dart';
// import '../../features/admin/domain/repositories/admin_repository.dart';
// import '../../features/admin/domain/usecases/fetch_platform_overview.dart';
// import '../../features/admin/domain/usecases/fetch_owners.dart';
// import '../../features/admin/domain/usecases/provision_owner.dart';

final sl = GetIt.instance;

Future<void> initDependencies() async {
  // External
  final prefs = await SharedPreferences.getInstance();
  sl.registerSingleton<SharedPreferences>(prefs);
  sl.registerSingleton<RealtimeManager>(RealtimeManager.instance);

  // ── Auth ─────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(() => AuthRemoteDataSourceImpl());
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()));
  sl.registerLazySingleton(() => SignInWithOtp(sl()));
  sl.registerLazySingleton(() => VerifyOtp(sl()));
  sl.registerLazySingleton(() => SignOut(sl(), sl()));
  sl.registerLazySingleton(() => GetCurrentUser(sl()));
  sl.registerFactory(() => AuthCubit(
    signInWithOtp: sl(),
    verifyOtp: sl(),
    signOut: sl(),
    getCurrentUser: sl(),
  ));

  // ── Context ───────────────────────────────────────────────
  sl.registerLazySingleton<ContextRemoteDataSource>(() => ContextRemoteDataSourceImpl());
  sl.registerLazySingleton<ContextRepository>(() => ContextRepositoryImpl(sl(), sl()));
  sl.registerLazySingleton(() => LoadContext(sl()));
  sl.registerFactory(() => ContextCubit(loadContext: sl()));

  // ── Orders (shared) ───────────────────────────────────────
  sl.registerLazySingleton<OrderRemoteDataSource>(() => OrderRemoteDataSourceImpl());
  sl.registerLazySingleton<OrderRepository>(() => OrderRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchLiveOrders(sl()));
  sl.registerLazySingleton(() => FetchKitchenOrders(sl()));
  sl.registerLazySingleton(() => FetchCashierOrders(sl()));
  sl.registerLazySingleton(() => TransitionOrderStatus(sl()));
  sl.registerLazySingleton(() => ProcessPayment(sl()));

  sl.registerFactory(() => LiveOrderBoardCubit(
        fetchLiveOrders: sl(),
        transitionOrderStatus: sl(),
        realtimeManager: sl(),
      ));

  sl.registerFactory(() => KitchenCubit(
        orderRepo: sl(),
        realtimeManager: sl(),
      ));

  sl.registerFactory(() => CashierCubit(
        fetchCashierOrders: sl(),
        processPayment: sl(),
        realtimeManager: sl(),
      ));

  // ── Tables ────────────────────────────────────────────────
  sl.registerLazySingleton<TablesRemoteDataSource>(() => TablesRemoteDataSourceImpl());
  sl.registerLazySingleton<TablesRepository>(() => TablesRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchTables(sl()));
  sl.registerLazySingleton(() => AddTable(sl()));
  sl.registerLazySingleton(() => const GenerateQrCode());
  sl.registerFactory(() => TablesCubit(
        fetchTables: sl(),
        addTable: sl(),
        generateQrCode: sl(),
        realtimeManager: sl(),
      ));

  // ── Menu ──────────────────────────────────────────────────
  sl.registerLazySingleton<MenuRemoteDataSource>(() => MenuRemoteDataSourceImpl());
  sl.registerLazySingleton<MenuRepository>(() => MenuRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchMenu(sl()));
  sl.registerLazySingleton(() => SaveCategory(sl()));
  sl.registerLazySingleton(() => SaveMenuItem(sl()));
  sl.registerLazySingleton(() => ToggleAvailability(sl()));
  sl.registerLazySingleton(() => DeleteCategory(sl()));
  sl.registerLazySingleton(() => DeleteMenuItem(sl()));
  sl.registerFactory(() => MenuCubit(
        fetchMenu: sl(),
        saveCategory: sl(),
        deleteCategory: sl(),
        saveMenuItem: sl(),
        deleteMenuItem: sl(),
        toggleAvailability: sl(),
        realtimeManager: sl(),
      ));

  // ── Staff ─────────────────────────────────────────────────
  sl.registerLazySingleton<StaffRemoteDataSource>(() => StaffRemoteDataSourceImpl());
  sl.registerLazySingleton<StaffRepository>(() => StaffRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchStaff(sl()));
  sl.registerLazySingleton(() => InviteStaff(sl()));
  sl.registerLazySingleton(() => UpdatePermissions(sl()));
  sl.registerLazySingleton(() => ToggleStaffActive(sl()));
  sl.registerLazySingleton(() => FetchInvitations(sl()));
  sl.registerFactory(() => StaffCubit(
        fetchStaff: sl(),
        fetchInvitations: sl(),
        inviteStaff: sl(),
        updatePermissions: sl(),
        toggleStaffActive: sl(),
        realtimeManager: sl(),
      ));

  // ── Settings ──────────────────────────────────────────────
  // sl.registerLazySingleton<SettingsRemoteDataSource>(() => SettingsRemoteDataSourceImpl());
  // sl.registerLazySingleton<SettingsRepository>(() => SettingsRepositoryImpl(sl()));
  // sl.registerLazySingleton(() => FetchSettings(sl()));
  // sl.registerLazySingleton(() => SaveSettings(sl()));

  // ── Notifications ─────────────────────────────────────────
  sl.registerLazySingleton<NotificationsRemoteDataSource>(() => NotificationsRemoteDataSourceImpl());
  sl.registerLazySingleton<NotificationsRepository>(() => NotificationsRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchNotifications(sl()));
  sl.registerLazySingleton(() => MarkNotificationRead(sl()));
  sl.registerFactory(() => NotificationsCubit(
    fetchNotifications: sl(),
    markNotificationRead: sl(),
    realtimeManager: sl(),
  ));

  // ── Admin ─────────────────────────────────────────────────
  /*
  sl.registerLazySingleton<AdminRemoteDataSource>(() => AdminRemoteDataSourceImpl());
  sl.registerLazySingleton<AdminRepository>(() => AdminRepositoryImpl(sl()));
  sl.registerLazySingleton(() => FetchPlatformOverview(sl()));
  sl.registerLazySingleton(() => FetchOwners(sl()));
  sl.registerLazySingleton(() => ProvisionOwner(sl()));
  */
}
