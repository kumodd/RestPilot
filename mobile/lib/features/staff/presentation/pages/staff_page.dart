// ============================================================
// RestPilot — Staff Page UI
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/utils/constants.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../context/presentation/cubit/context_cubit.dart';
import '../../../notifications/presentation/widgets/notifications_ui.dart';
import '../../domain/entities/staff_member.dart';
import '../cubit/staff_cubit.dart';

class StaffPage extends StatelessWidget {
  const StaffPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = sl<StaffCubit>();
        final ctxState = context.read<ContextCubit>().state;
        if (ctxState is ContextLoaded) {
          cubit.loadStaff(ctxState.context.selectedRestaurant.id);
        }
        return cubit;
      },
      child: DefaultTabController(
        length: 3,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Manage Staff'),
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            actions: const [NotificationsIconBadge()],
            bottom: const TabBar(
              tabs: [
                Tab(text: 'Active'),
                Tab(text: 'Pending Invites'),
                Tab(text: 'Inactive'),
              ],
            ),
          ),
          body: BlocBuilder<StaffCubit, StaffState>(
            builder: (context, state) {
              if (state is StaffLoading || state is StaffInitial) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state is StaffError) {
                return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
              }
              if (state is StaffLoaded) {
                return TabBarView(
                  children: [
                    _StaffList(members: state.activeMembers),
                    _InviteList(invitations: state.pendingInvitations),
                    _StaffList(members: state.inactiveMembers),
                  ],
                );
              }
              return const SizedBox.shrink();
            },
          ),
          floatingActionButton: BlocBuilder<ContextCubit, ContextState>(
            builder: (context, ctxState) {
              if (ctxState is ContextLoaded && ctxState.context.canManageStaff) {
                return FloatingActionButton.extended(
                  onPressed: () => _showInviteDialog(context),
                  icon: const Icon(Icons.person_add),
                  label: const Text('Invite Staff'),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }

  void _showInviteDialog(BuildContext parentContext) {
    final ctxState = parentContext.read<ContextCubit>().state;
    final authState = parentContext.read<AuthCubit>().state;
    if (ctxState is! ContextLoaded || authState is! Authenticated) return;

    final staffCubit = parentContext.read<StaffCubit>();
    final emailController = TextEditingController();
    String selectedRole = 'waiter';
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: parentContext,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Invite Staff'),
            content: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: emailController,
                    decoration: const InputDecoration(labelText: 'Email Address'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedRole,
                    decoration: const InputDecoration(labelText: 'Role'),
                    items: kRoleConfig.entries.map((e) {
                      // Prevent assigning platform admin
                      if (e.key == 'platform_admin' || e.key == 'owner') return null;
                      return DropdownMenuItem(value: e.key, child: Text(e.value.label));
                    }).whereType<DropdownMenuItem<String>>().toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => selectedRole = val);
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () {
                  if (formKey.currentState?.validate() ?? false) {
                    staffCubit.inviteStaff(
                      restaurantId: ctxState.context.selectedRestaurant.id,
                      branchId: ctxState.context.selectedBranch.id, // optional for some roles
                      email: emailController.text,
                      role: selectedRole,
                      permissions: {
                        for (var p in AppConstants.defaultPermissionsForRole(selectedRole)) p: true
                      },
                      invitedBy: authState.profile.id,
                    );
                    Navigator.pop(ctx);
                  }
                },
                child: const Text('Send Invite'),
              ),
            ],
          );
        }
      ),
    );
  }
}

class _StaffList extends StatelessWidget {
  final List<StaffMember> members;
  const _StaffList({required this.members});

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) return const Center(child: Text('No staff found.'));
    return ListView.builder(
      itemCount: members.length,
      itemBuilder: (context, index) {
        final m = members[index];
        final roleConf = kRoleConfig[m.role];
        return ListTile(
          leading: CircleAvatar(
            backgroundImage: m.avatarUrl != null ? NetworkImage(m.avatarUrl!) : null,
            child: m.avatarUrl == null ? Text(m.fullName?.substring(0, 1).toUpperCase() ?? '?') : null,
          ),
          title: Text(m.fullName ?? m.email ?? 'Unknown User', style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('${roleConf?.label ?? m.role} • Joined ${formatDate(m.joinedAt)}'),
          trailing: Switch(
            value: m.isActive,
            onChanged: (val) {
              context.read<StaffCubit>().toggleStaffActive(m.id, val);
            },
          ),
        );
      },
    );
  }
}

class _InviteList extends StatelessWidget {
  final List<Invitation> invitations;
  const _InviteList({required this.invitations});

  @override
  Widget build(BuildContext context) {
    if (invitations.isEmpty) return const Center(child: Text('No pending invitations.'));
    return ListView.builder(
      itemCount: invitations.length,
      itemBuilder: (context, index) {
        final inv = invitations[index];
        final roleConf = kRoleConfig[inv.role];
        return ListTile(
          leading: const CircleAvatar(child: Icon(Icons.mail)),
          title: Text(inv.email, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('Invited as ${roleConf?.label ?? inv.role} • ${formatDate(inv.createdAt)}'),
          trailing: const Chip(label: Text('Pending'), backgroundColor: Colors.orangeAccent),
        );
      },
    );
  }
}
