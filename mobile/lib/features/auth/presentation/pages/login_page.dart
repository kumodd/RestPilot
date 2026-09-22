// ============================================================
// RestPilot — Login Page
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../cubit/auth_cubit.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _submitEmail() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthCubit>().sendOtp(_emailController.text);
    }
  }

  void _submitOtp(String email) {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthCubit>().verifyOtp(
            email: email,
            token: _otpController.text.trim(),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocConsumer<AuthCubit, AuthState>(
        listener: (context, state) {
          if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is Authenticated) {
            context.go('/select-restaurant');
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;
          final isOtpMode = state is OtpSent;

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Card(
                  elevation: 8,
                  shadowColor: Colors.black12,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.restaurant, size: 64, color: Colors.blueAccent),
                          const SizedBox(height: 16),
                          Text(
                            'RestPilot Staff',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isOtpMode 
                                ? 'Enter the 6-digit code sent to your email.'
                                : 'Enter your staff email to receive a one-time code.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 32),
                          if (!isOtpMode)
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: 'Email Address',
                                prefixIcon: const Icon(Icons.email_outlined),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty || !value.contains('@')) {
                                  return 'Please enter a valid email';
                                }
                                return null;
                              },
                              onFieldSubmitted: (_) => _submitEmail(),
                              enabled: !isLoading,
                            )
                          else
                            TextFormField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: '6-Digit OTP',
                                prefixIcon: const Icon(Icons.pin_outlined),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              maxLength: 6,
                              validator: (value) {
                                if (value == null || value.length != 6) {
                                  return 'Please enter the 6-digit code';
                                }
                                return null;
                              },
                              onFieldSubmitted: (_) => _submitOtp((state as OtpSent).email),
                              enabled: !isLoading,
                            ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: isLoading
                                ? null
                                : () {
                                    if (isOtpMode) {
                                      _submitOtp((state as OtpSent).email);
                                    } else {
                                      _submitEmail();
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              backgroundColor: Colors.blueAccent,
                              foregroundColor: Colors.white,
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : Text(isOtpMode ? 'Verify & Sign In' : 'Send Email Code'),
                          ),
                          if (isOtpMode) ...[
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: isLoading
                                  ? null
                                  : () {
                                      context.read<AuthCubit>().checkAuthStatus();
                                    },
                              child: const Text('Use a different email'),
                            ),
                          ]
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
