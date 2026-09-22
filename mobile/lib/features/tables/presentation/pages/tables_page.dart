// ============================================================
// RestPilot — Tables Page UI
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/constants.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../domain/entities/restaurant_table.dart';
import '../cubit/tables_cubit.dart';

class TablesPage extends StatelessWidget {
  const TablesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<TablesCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadTables(ctxState.context.selectedBranch.id);
        }
        return cubit;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Manage Tables'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          actions: const [NotificationsIconBadge()],
        ),
        body: BlocBuilder<TablesCubit, TablesState>(
          builder: (context, state) {
            if (state is TablesLoading || state is TablesInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is TablesError) {
              return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
            }
            if (state is TablesLoaded) {
              return _buildGrid(context, state);
            }
            return const SizedBox.shrink();
          },
        ),
        floatingActionButton: BlocBuilder<ContextCubit, ContextState>(
          builder: (context, ctxState) {
            if (ctxState is ContextLoaded && ctxState.context.canManageTables) {
              return FloatingActionButton(
                onPressed: () => _showAddTableDialog(context),
                child: const Icon(Icons.add),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildGrid(BuildContext context, TablesLoaded state) {
    if (state.tables.isEmpty) {
      return const Center(child: Text('No tables added yet.'));
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 200,
        childAspectRatio: 1,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: state.tables.length,
      itemBuilder: (context, index) {
        final table = state.tables[index];
        final statusConfig = kTableStatusConfig[table.status];
        final color = Color(statusConfig?['color'] as int? ?? 0xFF737373);
        final label = statusConfig?['label'] as String? ?? 'Unknown';

        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: color, width: 2),
          ),
          child: InkWell(
            onTap: () => _showTableDetailsDialog(context, table),
            borderRadius: BorderRadius.circular(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(table.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.people, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('${table.capacity}', style: const TextStyle(color: Colors.grey)),
                  ],
                )
              ],
            ),
          ),
        );
      },
    );
  }

  void _showTableDetailsDialog(BuildContext context, RestaurantTable table) {
    // In real app, baseUrl comes from .env via constants
    const baseUrl = 'https://restpilot.space'; 
    final qrUrl = table.getQrUrl(baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(table.label),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 200,
              height: 200,
              child: QrImageView(
                data: qrUrl,
                version: QrVersions.auto,
              ),
            ),
            const SizedBox(height: 16),
            const Text('Customers scan this QR code to order.', textAlign: TextAlign.center),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          ElevatedButton.icon(
            onPressed: () {
              Share.share('Order at ${table.label}: $qrUrl');
            },
            icon: const Icon(Icons.share),
            label: const Text('Share Link'),
          ),
        ],
      ),
    );
  }

  void _showAddTableDialog(BuildContext parentContext) {
    final ctxState = parentContext.read<ContextCubit>().state;
    if (ctxState is! ContextLoaded) return;
    
    final tablesCubit = parentContext.read<TablesCubit>();
    final tableNumController = TextEditingController();
    final capacityController = TextEditingController(text: '4');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: parentContext,
      builder: (ctx) => AlertDialog(
        title: const Text('Add New Table'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: tableNumController,
                decoration: const InputDecoration(labelText: 'Table Number (e.g., 10, A1)'),
                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: capacityController,
                decoration: const InputDecoration(labelText: 'Seat Capacity'),
                keyboardType: TextInputType.number,
                validator: (v) => (v == null || int.tryParse(v) == null) ? 'Invalid' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                tablesCubit.addNewTable(
                  restaurantId: ctxState.context.selectedRestaurant.id,
                  branchId: ctxState.context.selectedBranch.id,
                  tableNumber: tableNumController.text,
                  capacity: int.parse(capacityController.text),
                );
                Navigator.pop(ctx);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
