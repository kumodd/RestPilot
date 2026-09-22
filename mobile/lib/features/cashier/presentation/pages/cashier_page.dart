// ============================================================
// RestPilot — Cashier Page
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/price.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../../orders/domain/entities/order.dart';
import '../cubit/cashier_cubit.dart';

class CashierPage extends StatelessWidget {
  const CashierPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<CashierCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadOrders(ctxState.context.selectedBranch.id);
        }
        return cubit;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Cashier'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 1,
          actions: const [NotificationsIconBadge()],
        ),
        body: BlocBuilder<CashierCubit, CashierState>(
          builder: (context, state) {
            if (state is CashierLoading || state is CashierInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is CashierError) {
              return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
            }
            if (state is CashierLoaded) {
              return Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: _OrderList(
                      title: 'Unpaid / Ready',
                      orders: state.ready.where((o) => !o.isPaid).toList(),
                      isProcessing: state.isProcessing,
                    ),
                  ),
                  const VerticalDivider(width: 1, color: Colors.grey),
                  Expanded(
                    flex: 1,
                    child: _OrderList(
                      title: 'Completed / Paid',
                      orders: [...state.completed, ...state.ready.where((o) => o.isPaid)],
                      isProcessing: state.isProcessing,
                      isCompletedView: true,
                    ),
                  ),
                ],
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  final String title;
  final List<Order> orders;
  final bool isProcessing;
  final bool isCompletedView;

  const _OrderList({
    required this.title,
    required this.orders,
    required this.isProcessing,
    this.isCompletedView = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final order = orders[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('#${order.orderNumber} - ${order.table?.label ?? 'Takeaway'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(formatDateTime(order.placedAt)),
                  trailing: Text(formatPrice(order.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  onTap: () => _showPaymentDialog(context, order),
                  tileColor: order.isPaid ? Colors.green[50] : null,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _showPaymentDialog(BuildContext context, Order order) {
    if (order.isPaid) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order is already paid.')));
       return;
    }
    
    // Read cubit before dialog launches to prevent context issues
    final cashierCubit = context.read<CashierCubit>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Process Payment for #${order.orderNumber}'),
        content: Text('Amount due: ${formatPrice(order.total)}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: isProcessing ? null : () {
              cashierCubit.processPayment(
                orderId: order.id,
                method: 'cash',
                amount: order.total,
              );
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: const Text('Pay with Cash'),
          ),
          ElevatedButton(
            onPressed: isProcessing ? null : () {
              cashierCubit.processPayment(
                orderId: order.id,
                method: 'card',
                amount: order.total,
              );
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
            child: const Text('Pay with Card'),
          ),
        ],
      ),
    );
  }
}
