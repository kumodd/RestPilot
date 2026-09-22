// ============================================================
// RestPilot — App Router
// ============================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/cubit/auth_cubit.dart';
import '../../features/context/presentation/cubit/context_cubit.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/context/presentation/pages/restaurant_selector_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';

class AppRouter {
  final AuthCubit authCubit;
  final ContextCubit contextCubit;

  AppRouter({required this.authCubit, required this.contextCubit});

  late final GoRouter router = GoRouter(
    initialLocation: '/login',
    refreshListenable: GoRouterRefreshStream(authCubit.stream),
    redirect: (context, state) {
      final authState = authCubit.state;
      final isLoggingIn = state.matchedLocation == '/login';
      final isAcceptInvite = state.matchedLocation == '/auth/accept-invite';

      if (authState is Unauthenticated || authState is AuthInitial) {
        return (isLoggingIn || isAcceptInvite) ? null : '/login';
      }

      if (authState is Authenticated) {
        if (isLoggingIn || isAcceptInvite) {
          return '/select-restaurant';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/accept-invite',
        builder: (context, state) {
          // While Supabase exchanges the token, we show a branded splash screen
          return Scaffold(
            backgroundColor: Colors.blueAccent,
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.restaurant, size: 80, color: Colors.white),
                  const SizedBox(height: 24),
                  const Text('RestPilot', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Verifying your invitation...', style: TextStyle(color: Colors.white70, fontSize: 16)),
                  const SizedBox(height: 32),
                  const CircularProgressIndicator(color: Colors.white),
                ],
              ),
            ),
          );
        },
      ),
      GoRoute(
        path: '/select-restaurant',
        builder: (context, state) => const RestaurantSelectorPage(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(child: SizedBox.shrink()),
      ),
    ],
  );
}

class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
