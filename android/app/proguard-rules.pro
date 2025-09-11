# React Native Reanimated and Worklets protection
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# React Navigation protection
-keep class com.reactnavigation.** { *; }

# Gesture Handler protection
-keep class com.swmansion.gesturehandler.** { *; }

# SafeAreaProvider protection
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native Screens protection
-keep class com.swmansion.rnscreens.** { *; }

# Expo modules protection
-keep class expo.modules.** { *; }

# React Native Elements protection
-keep class com.oblador.vectoricons.** { *; }

# Async Storage protection
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Supabase/Network protection
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# General React Native protection
-dontwarn com.facebook.react.**
-dontwarn com.swmansion.**
-keep class com.facebook.react.turbomodule.** { *; }