import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/di/injection.dart';
import 'core/router/app_router.dart';
import 'features/auth/presentation/cubit/auth_cubit.dart';
import 'features/context/presentation/cubit/context_cubit.dart';
import 'features/notifications/presentation/cubit/notifications_cubit.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment
  await dotenv.load(fileName: ".env");
  
  // Initialize Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  // Initialize DI
  await initDependencies();

  runApp(const RestPilotApp());
}

class RestPilotApp extends StatelessWidget {
  const RestPilotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthCubit>(
          create: (context) => sl<AuthCubit>()..checkAuthStatus(),
        ),
        BlocProvider<ContextCubit>(
          create: (context) => sl<ContextCubit>(),
        ),
        BlocProvider<NotificationsCubit>(
          create: (context) => sl<NotificationsCubit>(),
        ),
      ],
      child: Builder(
        builder: (context) {
          final router = AppRouter(
            authCubit: context.read<AuthCubit>(),
            contextCubit: context.read<ContextCubit>(),
          ).router;

          return MaterialApp.router(
            title: 'RestPilot Staff',
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
              useMaterial3: true,
            ),
            routerConfig: router,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
