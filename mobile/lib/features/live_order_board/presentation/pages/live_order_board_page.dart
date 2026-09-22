// ============================================================
// RestPilot — Live Order Board Page
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/constants.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../../core/utils/price.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../../orders/domain/entities/order.dart';
import '../cubit/live_order_board_cubit.dart';

class LiveOrderBoardPage extends StatelessWidget {
  const LiveOrderBoardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<LiveOrderBoardCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadOrders(ctxState.context.selectedBranch.id);
        }
        return cubit;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Live Orders'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 1,
          actions: const [NotificationsIconBadge()],
        ),
        body: BlocBuilder<LiveOrderBoardCubit, LiveOrderBoardState>(
          builder: (context, state) {
            if (state is LiveOrderBoardLoading || state is LiveOrderBoardInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is LiveOrderBoardError) {
              return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
            }
            if (state is LiveOrderBoardLoaded) {
              return _buildBoard(context, state);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildBoard(BuildContext context, LiveOrderBoardLoaded state) {
    // Basic Kanban layout: Horizontal scroll of columns
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(16),
      children: [
        _buildColumn(context, 'Awaiting', state.awaitingWaiter, state.isProcessing),
        const SizedBox(width: 16),
        _buildColumn(context, 'Confirmed', state.confirmed, state.isProcessing),
        const SizedBox(width: 16),
        _buildColumn(context, 'In Kitchen', state.inKitchen, state.isProcessing),
        const SizedBox(width: 16),
        _buildColumn(context, 'Ready', state.ready, state.isProcessing),
        const SizedBox(width: 16),
        _buildColumn(context, 'Served', state.served, state.isProcessing),
      ],
    );
  }

  Widget _buildColumn(BuildContext context, String title, List<Order> orders, bool isProcessing) {
    return Container(
      width: 320,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                CircleAvatar(
                  radius: 12,
                  backgroundColor: Colors.blueAccent,
                  child: Text('${orders.length}', style: const TextStyle(fontSize: 12, color: Colors.white)),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: orders.length,
              itemBuilder: (context, index) {
                return _OrderCard(order: orders[index], isProcessing: isProcessing);
              },
            ),
          )
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final bool isProcessing;

  const _OrderCard({required this.order, required this.isProcessing});

  @override
  Widget build(BuildContext context) {
    final urgencyMins = order.elapsedMinutes;
    final isWarning = urgencyMins >= AppConstants.orderUrgencyWarningMinutes;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isWarning ? const BorderSide(color: Colors.red, width: 2) : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('#${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                Text(formatElapsed(order.urgencyFrom), 
                     style: TextStyle(color: isWarning ? Colors.red : Colors.grey, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Text(order.table?.label ?? 'Takeaway / Unknown Table'),
            const SizedBox(height: 8),
            Text('${order.items.length} items', style: TextStyle(color: Colors.grey[700])),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(formatPrice(order.total), style: const TextStyle(fontWeight: FontWeight.bold)),
                if (order.isPlaced)
                  ElevatedButton(
                    onPressed: isProcessing ? null : () => _confirmOrder(context),
                    child: const Text('Confirm'),
                  ),
              ],
            )
          ],
        ),
      ),
    );
  }

  void _confirmOrder(BuildContext context) {
    final authState = context.read<AuthCubit>().state;
    if (authState is Authenticated) {
      context.read<LiveOrderBoardCubit>().advanceStatus(
        orderId: order.id,
        newStatus: 'confirmed',
        actorId: authState.profile.id,
        actorType: 'staff',
      );
    }
  }
}
