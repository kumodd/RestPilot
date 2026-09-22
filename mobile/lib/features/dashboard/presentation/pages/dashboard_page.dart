// ============================================================
// RestPilot — Dashboard Nav Shell
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../context/presentation/cubit/context_cubit.dart';

import '../../../live_order_board/presentation/pages/live_order_board_page.dart';
import '../../../kitchen/presentation/pages/kitchen_display_page.dart';
import '../../../cashier/presentation/pages/cashier_page.dart';
import '../../../tables/presentation/pages/tables_page.dart';
import '../../../menu/presentation/pages/menu_page.dart';
import '../../../staff/presentation/pages/staff_page.dart';
import '../../../settings/presentation/pages/settings_page.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../../notifications/presentation/cubit/notifications_cubit.dart';

class DashboardPage extends StatefulWidget {
  final Widget child;
  const DashboardPage({super.key, required this.child});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  int _currentIndex = 0;

  void _onItemTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ContextCubit, ContextState>(
      builder: (context, state) {
        if (state is! ContextLoaded) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final ctx = state.context;
        final destinations = <({BottomNavigationBarItem item, Widget page})>[];

        if (ctx.canViewOrders) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.list_alt), label: 'Orders'), page: const LiveOrderBoardPage()));
        }
        if (ctx.canKitchenDisplay) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.kitchen), label: 'Kitchen'), page: const KitchenDisplayPage()));
        }
        if (ctx.isCashier || ctx.isManager || ctx.isOwner || ctx.isPlatformAdmin) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.point_of_sale), label: 'Cashier'), page: const CashierPage()));
        }
        if (ctx.canManageTables) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.table_restaurant), label: 'Tables'), page: const TablesPage()));
        }
        if (ctx.canManageMenu) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.restaurant_menu), label: 'Menu'), page: const MenuPage()));
        }
        if (ctx.canManageStaff) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Staff'), page: const StaffPage()));
        }
        if (ctx.isOwner || ctx.isPlatformAdmin) {
          destinations.add((item: const BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'), page: const SettingsPage()));
        }

        if (destinations.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: const Text('RestPilot')),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No access to any dashboard features.'),
                  ElevatedButton(
                    onPressed: () => context.read<AuthCubit>().signOut(),
                    child: const Text('Sign Out'),
                  )
                ],
              ),
            ),
          );
        }

        if (_currentIndex >= destinations.length) _currentIndex = 0;

        // Initialize Notifications if not already done
        final authState = context.read<AuthCubit>().state;
        if (authState is Authenticated) {
           final notifsCubit = context.read<NotificationsCubit>();
           if (notifsCubit.state is NotificationsInitial) {
             notifsCubit.loadNotifications(
               restaurantId: ctx.selectedRestaurant.id,
               branchId: ctx.selectedBranch.id,
               profileId: authState.profile.id,
             );
           }
        }

        return LayoutBuilder(
          builder: (context, constraints) {
            final isMobile = constraints.maxWidth < 600;

            if (!isMobile) {
              // TABLET/DESKTOP: NavigationRail
              return Scaffold(
                endDrawer: const NotificationsDrawer(),
                body: Row(
                  children: [
                    NavigationRail(
                      selectedIndex: _currentIndex,
                      onDestinationSelected: _onItemTapped,
                      labelType: NavigationRailLabelType.all,
                      destinations: destinations.map((d) {
                        return NavigationRailDestination(
                          icon: d.item.icon,
                          label: Text(d.item.label ?? ''),
                        );
                      }).toList(),
                    ),
                    const VerticalDivider(thickness: 1, width: 1),
                    Expanded(child: destinations[_currentIndex].page),
                  ],
                ),
              );
            } else {
              // MOBILE: NavigationBar (truncate if > 5)
              if (destinations.length <= 5) {
                return Scaffold(
                  endDrawer: const NotificationsDrawer(),
                  body: destinations[_currentIndex].page,
                  bottomNavigationBar: NavigationBar(
                    selectedIndex: _currentIndex,
                    onDestinationSelected: _onItemTapped,
                    destinations: destinations.map((d) {
                      return NavigationDestination(icon: d.item.icon, label: d.item.label ?? '');
                    }).toList(),
                  ),
                );
              } else {
                // More than 5 items - use a Drawer for the extras
                final primary = destinations.take(4).toList();
                final isMoreSelected = _currentIndex >= 4;

                return Scaffold(
                  endDrawer: const NotificationsDrawer(),
                  drawer: Drawer(
                    child: SafeArea(
                      child: Column(
                        children: [
                          const Padding(
                            padding: EdgeInsets.all(16.0),
                            child: Text('More Features', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ),
                          const Divider(),
                          ...List.generate(destinations.length - 4, (i) {
                            final actualIndex = i + 4;
                            final d = destinations[actualIndex];
                            return ListTile(
                              leading: d.item.icon,
                              title: Text(d.item.label ?? ''),
                              selected: _currentIndex == actualIndex,
                              onTap: () {
                                _onItemTapped(actualIndex);
                                Navigator.pop(context);
                              },
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                  body: destinations[_currentIndex].page,
                  bottomNavigationBar: Builder(
                    builder: (innerContext) {
                      return NavigationBar(
                        selectedIndex: isMoreSelected ? 4 : _currentIndex,
                        onDestinationSelected: (index) {
                          if (index == 4) {
                            Scaffold.of(innerContext).openDrawer();
                          } else {
                            _onItemTapped(index);
                          }
                        },
                        destinations: [
                          ...primary.map((d) => NavigationDestination(icon: d.item.icon, label: d.item.label ?? '')),
                          const NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
                        ],
                      );
                    }
                  ),
                );
              }
            }
          },
        );
      },
    );
  }
}
