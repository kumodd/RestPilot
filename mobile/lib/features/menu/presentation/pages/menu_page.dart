// ============================================================
// RestPilot — Menu Page UI
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/price.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../domain/entities/menu_entity.dart';
import '../cubit/menu_cubit.dart';

class MenuPage extends StatelessWidget {
  const MenuPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<MenuCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadMenu(ctxState.context.selectedRestaurant.id);
        }
        return cubit;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Manage Menu'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          actions: const [NotificationsIconBadge()],
        ),
        body: BlocBuilder<MenuCubit, MenuState>(
          builder: (context, state) {
            if (state is MenuLoading || state is MenuInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is MenuError) {
              return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
            }
            if (state is MenuLoaded) {
              return _buildList(context, state);
            }
            return const SizedBox.shrink();
          },
        ),
        floatingActionButton: BlocBuilder<ContextCubit, ContextState>(
          builder: (context, ctxState) {
            if (ctxState is ContextLoaded && ctxState.context.canManageMenu) {
              return FloatingActionButton(
                onPressed: () {
                  // In a real app, this would open a dialog or sheet to add a Category or Item.
                  // For brevity, we'll just show a snackbar.
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Open Add Menu Item dialog')));
                },
                child: const Icon(Icons.add),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, MenuLoaded state) {
    if (state.categories.isEmpty) {
      return const Center(child: Text('No menu items found.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.categories.length,
      itemBuilder: (context, index) {
        final category = state.categories[index];
        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ExpansionTile(
            title: Text(category.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            subtitle: Text('${category.items.length} items'),
            initiallyExpanded: true,
            children: category.items.map((item) {
              return ListTile(
                title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(formatPrice(item.price)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(item.isAvailable ? 'Available' : 'Out of Stock', 
                         style: TextStyle(color: item.isAvailable ? Colors.green : Colors.red, fontSize: 12)),
                    const SizedBox(width: 8),
                    Switch(
                      value: item.isAvailable,
                      onChanged: (val) {
                        context.read<MenuCubit>().toggleItemAvailability(item.id, val);
                      },
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }
}
