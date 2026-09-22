// ============================================================
// RestPilot — Kitchen Display Page
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/constants.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../../orders/domain/entities/order.dart';
import '../cubit/kitchen_cubit.dart';

class KitchenDisplayPage extends StatelessWidget {
  const KitchenDisplayPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<KitchenCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadOrders(ctxState.context.selectedBranch.id);
        }
        return cubit;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kitchen Display'),
          backgroundColor: Colors.black87,
          foregroundColor: Colors.white,
          actions: const [NotificationsIconBadge()],
        ),
        backgroundColor: Colors.grey[900], // Dark mode for kitchen
        body: BlocBuilder<KitchenCubit, KitchenState>(
          builder: (context, state) {
            if (state is KitchenLoading || state is KitchenInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is KitchenError) {
              return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
            }
            if (state is KitchenLoaded) {
              return _buildGrid(context, state);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildGrid(BuildContext context, KitchenLoaded state) {
    if (state.orders.isEmpty) {
      return const Center(
        child: Text('No active orders.', style: TextStyle(color: Colors.white54, fontSize: 18)),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3, // 3 columns for KDS
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.8,
      ),
      itemCount: state.orders.length,
      itemBuilder: (context, index) {
        return _KitchenTicket(order: state.orders[index], isProcessing: state.isProcessing);
      },
    );
  }
}

class _KitchenTicket extends StatelessWidget {
  final Order order;
  final bool isProcessing;

  const _KitchenTicket({required this.order, required this.isProcessing});

  @override
  Widget build(BuildContext context) {
    final urgencyMins = order.elapsedMinutes;
    final isWarning = urgencyMins >= AppConstants.kdsUrgencyWarningMinutes;
    final isCritical = urgencyMins >= AppConstants.kdsUrgencyCriticalMinutes;

    Color headerColor = Colors.blueGrey;
    if (isCritical) headerColor = Colors.red[700]!;
    else if (isWarning) headerColor = Colors.orange[700]!;
    else if (order.isReady) headerColor = Colors.green[700]!;

    return Card(
      color: Colors.grey[850],
      clipBehavior: Clip.antiAlias,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: headerColor,
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '#${order.orderNumber} - ${order.table?.label ?? 'Takeaway'}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                ),
                Text(
                  formatElapsed(order.urgencyFrom),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(8),
              itemCount: order.items.length,
              separatorBuilder: (_, __) => const Divider(color: Colors.grey),
              itemBuilder: (context, index) {
                final item = order.items[index];
                return ListTile(
                  title: Text('${item.quantity}x ${item.itemNameSnapshot}', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  subtitle: item.specialInstructions != null
                      ? Text(item.specialInstructions!, style: const TextStyle(color: Colors.redAccent))
                      : null,
                  trailing: Checkbox(
                    value: item.isReady,
                    onChanged: (val) {
                      context.read<KitchenCubit>().toggleItemStatus(item.id, item.status);
                    },
                  ),
                );
              },
            ),
          ),
          if (order.status == 'kitchen_accepted' || order.status == 'preparing')
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                onPressed: isProcessing ? null : () => _markOrderReady(context),
                child: const Text('Mark All Ready'),
              ),
            ),
          if (order.status == 'confirmed')
             Padding(
              padding: const EdgeInsets.all(8.0),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
                onPressed: isProcessing ? null : () => _acceptOrder(context),
                child: const Text('Start Preparing'),
              ),
            ),
        ],
      ),
    );
  }

  void _acceptOrder(BuildContext context) {
    final authState = context.read<AuthCubit>().state;
    if (authState is Authenticated) {
      context.read<KitchenCubit>().advanceStatus(
        orderId: order.id,
        newStatus: 'preparing',
        actorId: authState.profile.id,
        actorType: 'staff',
      );
    }
  }

  void _markOrderReady(BuildContext context) {
    final authState = context.read<AuthCubit>().state;
    if (authState is Authenticated) {
      context.read<KitchenCubit>().advanceStatus(
        orderId: order.id,
        newStatus: 'ready',
        actorId: authState.profile.id,
        actorType: 'staff',
      );
    }
  }
}
