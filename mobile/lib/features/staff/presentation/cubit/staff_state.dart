part of 'staff_cubit.dart';

abstract class StaffState extends Equatable {
  const StaffState();
  @override
  List<Object?> get props => [];
}

class StaffInitial extends StaffState {
  const StaffInitial();
}

class StaffLoading extends StaffState {
  const StaffLoading();
}

class StaffLoaded extends StaffState {
  final List<StaffMember> members;
  final List<Invitation> invitations;
  final bool isProcessing;

  const StaffLoaded({
    required this.members,
    required this.invitations,
    required this.isProcessing,
  });

  List<StaffMember> get activeMembers => members.where((m) => m.isActive).toList();
  List<StaffMember> get inactiveMembers => members.where((m) => !m.isActive).toList();
  List<Invitation> get pendingInvitations => invitations.where((i) => i.isPending).toList();

  StaffLoaded copyWith({
    List<StaffMember>? members,
    List<Invitation>? invitations,
    bool? isProcessing,
  }) {
    return StaffLoaded(
      members: members ?? this.members,
      invitations: invitations ?? this.invitations,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }

  @override
  List<Object?> get props => [members, invitations, isProcessing];
}

class StaffError extends StaffState {
  final String message;
  const StaffError(this.message);
  @override
  List<Object?> get props => [message];
}

class StaffActionError extends StaffLoaded {
  final String error;
  const StaffActionError({
    required super.members,
    required super.invitations,
    required this.error,
  }) : super(isProcessing: false);

  @override
  List<Object?> get props => [members, invitations, error];
}
