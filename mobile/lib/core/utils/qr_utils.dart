// ============================================================
// RestPilot — QR Token Utilities
// ============================================================

import 'dart:math';
import 'dart:convert';
import 'package:crypto/crypto.dart';

/// Generates a 64-character hex token (32 random bytes) — matches web generateQRToken()
String generateQrToken() {
  final rng = Random.secure();
  final bytes = List<int>.generate(32, (_) => rng.nextInt(256));
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}

/// Builds the QR URL that customers scan
String buildQrUrl(String appWebUrl, String token) => '$appWebUrl/t/$token';
