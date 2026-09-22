// ============================================================
// RestPilot — Settings Page UI
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../../context/domain/entities/app_context.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ContextCubit, ContextState>(
      builder: (context, state) {
        if (state is! ContextLoaded) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final ctx = state.context;

        return DefaultTabController(
          length: 4,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Restaurant Settings'),
              backgroundColor: Colors.white,
              foregroundColor: Colors.black,
              actions: const [NotificationsIconBadge()],
              bottom: const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: 'General'),
                  Tab(text: 'Branches'),
                  Tab(text: 'Printing'),
                  Tab(text: 'Integrations'),
                ],
              ),
            ),
            body: TabBarView(
              children: [
                _GeneralTab(contextData: ctx),
                _BranchesTab(contextData: ctx),
                const Center(child: Text('Receipt Printing Config (Coming Soon)')),
                const Center(child: Text('Payment/API Integrations (Coming Soon)')),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _GeneralTab extends StatelessWidget {
  final AppContext contextData;
  const _GeneralTab({required this.contextData});

  @override
  Widget build(BuildContext context) {
    final restaurant = contextData.selectedRestaurant;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          title: const Text('Restaurant Name'),
          subtitle: Text(restaurant.name),
          trailing: const Icon(Icons.edit),
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Edit not implemented in demo'))),
        ),
        const Divider(),
        ListTile(
          title: const Text('Restaurant Slug'),
          subtitle: Text(restaurant.slug ?? 'N/A'),
        ),
        const Divider(),
        ListTile(
          title: const Text('Subscription Plan'),
          subtitle: Text(restaurant.subscriptionTier.toUpperCase()),
          trailing: const Chip(label: Text('Active'), backgroundColor: Colors.greenAccent),
        ),
      ],
    );
  }
}

class _BranchesTab extends StatelessWidget {
  final AppContext contextData;
  const _BranchesTab({required this.contextData});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 1, // Using selected branch for demo
      itemBuilder: (context, index) {
        final branch = contextData.selectedBranch;
        return Card(
          child: ListTile(
            title: Text(branch?.name ?? 'No Branch', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(branch?.address ?? 'No address provided'),
            trailing: const Icon(Icons.location_on),
          ),
        );
      },
    );
  }
}
