// ============================================================
// RestPilot — Date/Time Utilities
// ============================================================

import 'package:intl/intl.dart';

/// Returns human-readable elapsed time (e.g., "5m", "1h 20m")
String formatElapsed(DateTime? from) {
  if (from == null) return '—';
  final diff = DateTime.now().difference(from);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  final h = diff.inHours;
  final m = diff.inMinutes % 60;
  return m > 0 ? '${h}h ${m}m' : '${h}h';
}

/// Returns elapsed minutes for urgency checks
int elapsedMinutes(DateTime? from) {
  if (from == null) return 0;
  return DateTime.now().difference(from).inMinutes;
}

/// Format timestamp for display (e.g., "2:30 PM")
String formatTime(String? isoString) {
  if (isoString == null) return '—';
  try {
    final dt = DateTime.parse(isoString).toLocal();
    return DateFormat('h:mm a').format(dt);
  } catch (_) {
    return '—';
  }
}

/// Format date (e.g., "13 Sep 2026")
String formatDate(String? isoString) {
  if (isoString == null) return '—';
  try {
    final dt = DateTime.parse(isoString).toLocal();
    return DateFormat('d MMM yyyy').format(dt);
  } catch (_) {
    return '—';
  }
}

/// Format date+time
String formatDateTime(String? isoString) {
  if (isoString == null) return '—';
  try {
    final dt = DateTime.parse(isoString).toLocal();
    return DateFormat('d MMM, h:mm a').format(dt);
  } catch (_) {
    return '—';
  }
}

/// Parse ISO string to local DateTime safely
DateTime? parseDateTime(String? isoString) {
  if (isoString == null) return null;
  try {
    return DateTime.parse(isoString).toLocal();
  } catch (_) {
    return null;
  }
}
