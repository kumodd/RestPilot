// ============================================================
// RestPilot — Restaurant & Branch Selector Page
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../cubit/context_cubit.dart';
import '../../domain/entities/app_context.dart';

class RestaurantSelectorPage extends StatefulWidget {
  const RestaurantSelectorPage({super.key});

  @override
  State<RestaurantSelectorPage> createState() => _RestaurantSelectorPageState();
}

class _RestaurantSelectorPageState extends State<RestaurantSelectorPage> {
  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthCubit>().state;
    if (authState is Authenticated) {
      context.read<ContextCubit>().load(authState.profile);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Location'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthCubit>().signOut(),
          ),
        ],
      ),
      body: BlocConsumer<ContextCubit, ContextState>(
        listener: (context, state) {
          if (state is ContextError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          if (state is ContextLoading || state is ContextInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is ContextError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      final authState = context.read<AuthCubit>().state;
                      if (authState is Authenticated) {
                        context.read<ContextCubit>().load(authState.profile);
                      }
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          if (state is ContextLoaded) {
            final ctx = state.context;
            if (ctx.restaurants.isEmpty) {
              return const Center(child: Text('No assigned restaurants found.'));
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: ctx.restaurants.length,
              itemBuilder: (context, index) {
                final restaurant = ctx.restaurants[index];
                final restaurantBranches = ctx.branches.where((b) => b.restaurantId == restaurant.id).toList();

                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blueAccent.withOpacity(0.1),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.restaurant, color: Colors.blueAccent),
                            const SizedBox(width: 12),
                            Text(restaurant.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          ],
                        ),
                      ),
                      if (restaurantBranches.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('No active branches found.', style: TextStyle(color: Colors.grey)),
                        )
                      else
                        ...restaurantBranches.map((branch) => ListTile(
                          title: Text(branch.name),
                          subtitle: Text(branch.address ?? 'No address provided'),
                          trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                          onTap: () {
                            context.read<ContextCubit>().selectBranch(restaurant.id, branch.id);
                            context.go('/dashboard');
                          },
                        )),
                    ],
                  ),
                );
              },
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
