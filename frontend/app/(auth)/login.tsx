import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { setItem } from '@/utils/storage';
import { registerFirebasePushToken } from '@/utils/notifications';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { auth } from '@/utils/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_ENABLED =
  String(process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH || '').toLowerCase() === 'true';

const IS_EXPO_GO =
  (Constants as any)?.executionEnvironment === 'storeClient' ||
  (Constants as any)?.appOwnership === 'expo';

const CAN_USE_GOOGLE_AUTH = GOOGLE_AUTH_ENABLED && !IS_EXPO_GO;

/*
import { auth } from '@/utils/firebase'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'

WebBrowser.maybeCompleteAuthSession();
*/

const { width } = Dimensions.get('window');

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

// ─── Google Logo SVG ──────────────────────────────────────────
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </Svg>
);

// ─── Car Logo SVG (side profile silhouette) ───────────────────
const CarIcon = () => (
  <Svg width={48} height={36} viewBox="0 0 120 70" fill="none">
    {/* ── Main body lower chassis ── */}
    <Path
      d="M6 46 Q6 54 14 54 L106 54 Q114 54 114 46 L114 40 L6 40 Z"
      fill="#800007"
    />
    {/* ── Cabin upper silhouette ── */}
    <Path
      d="M28 40 Q32 22 42 16 Q52 10 60 10 Q72 10 82 16 Q90 22 94 40 Z"
      fill="#800007"
    />
    {/* ── Windshield (front) ── */}
    <Path
      d="M76 40 Q80 26 86 20 Q90 16 93 18 L94 40 Z"
      fill="#3d0003"
      opacity="0.85"
    />
    {/* ── Rear window ── */}
    <Path
      d="M28 40 Q30 26 36 19 Q40 14 44 14 Q48 12 52 11 L58 11 Q56 20 54 40 Z"
      fill="#3d0003"
      opacity="0.85"
    />
    {/* ── Side window (middle) ── */}
    <Path
      d="M56 40 Q57 18 62 11 Q70 10 78 14 Q82 22 80 40 Z"
      fill="#3d0003"
      opacity="0.7"
    />
    {/* ── Highlight line along roofline ── */}
    <Path
      d="M42 16 Q60 8 82 16"
      stroke="#996250"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* ── Body crease / side line ── */}
    <Path
      d="M10 43 Q60 39 110 43"
      stroke="#996250"
      strokeWidth="1"
      fill="none"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* ── Front bumper lip ── */}
    <Path
      d="M100 54 Q114 54 116 50 Q117 47 114 46 L114 54 Z"
      fill="#3d0003"
    />
    {/* ── Rear bumper lip ── */}
    <Path
      d="M20 54 Q6 54 4 50 Q3 47 6 46 L6 54 Z"
      fill="#3d0003"
    />
    {/* ── Front headlight ── */}
    <Path
      d="M104 38 Q108 37 112 39 Q113 41 110 42 L104 42 Z"
      fill="#F9F9F9"
      opacity="0.95"
    />
    {/* ── Rear taillight ── */}
    <Path
      d="M16 38 Q12 37 8 39 Q7 41 10 42 L16 42 Z"
      fill="#996250"
      opacity="0.9"
    />
    {/* ── Front wheel arch ── */}
    <Path
      d="M82 54 Q82 64 92 64 Q102 64 102 54 Z"
      fill="#1a0204"
    />
    {/* ── Front wheel ── */}
    <Path
      d="M84 54 Q84 62 92 62 Q100 62 100 54 Z"
      fill="#2a0508"
    />
    {/* ── Front wheel rim ── */}
    <Path
      d="M87 54 Q87 59 92 59 Q97 59 97 54 Z"
      fill="#800007"
      opacity="0.6"
    />
    {/* ── Rear wheel arch ── */}
    <Path
      d="M18 54 Q18 64 28 64 Q38 64 38 54 Z"
      fill="#1a0204"
    />
    {/* ── Rear wheel ── */}
    <Path
      d="M20 54 Q20 62 28 62 Q36 62 36 54 Z"
      fill="#2a0508"
    />
    {/* ── Rear wheel rim ── */}
    <Path
      d="M23 54 Q23 59 28 59 Q33 59 33 54 Z"
      fill="#800007"
      opacity="0.6"
    />
    {/* ── Door handle ── */}
    <Path
      d="M58 43 Q64 42 70 43 Q70 45 64 45 Q58 45 58 43 Z"
      fill="#996250"
      opacity="0.7"
    />
  </Svg>
);

// ─── Clean Input Field Component ──────────────────────────────
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  editable?: boolean;
  placeholder: string;
  leftIcon: React.ReactNode;
  rightElement?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label, value, onChangeText, error, secureTextEntry,
  keyboardType, autoCapitalize, editable = true,
  placeholder, leftIcon, rightElement,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={inp.group}>
      <Text style={inp.label}>{label}</Text>
      <View style={[
        inp.wrap,
        focused && inp.wrapFocused,
        !!error && inp.wrapError,
      ]}>
        <View style={inp.iconWrap}>{leftIcon}</View>
        <TextInput
          style={inp.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="rgba(153,98,80,0.4)"
        />
        {rightElement}
      </View>
      {!!error && (
        <View style={inp.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#800007" />
          <Text style={inp.errorText}> {error}</Text>
        </View>
      )}
    </View>
  );
};

const inp = StyleSheet.create({
  group: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(153,98,80,0.9)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,249,249,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(153,98,80,0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
  },
  wrapFocused: {
    borderColor: '#800007',
    backgroundColor: 'rgba(128,0,7,0.07)',
  },
  wrapError: {
    borderColor: '#800007',
    backgroundColor: 'rgba(128,0,7,0.08)',
  },
  iconWrap: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#F9F9F9',
    fontSize: 15,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 2,
  },
  errorText: {
    color: '#800007',
    fontSize: 12,
    fontWeight: '500',
  },
});

// ─── Main Login Screen ────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<{ field?: string; message?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Remove AuthSession web flow. Use native Google Sign-In for Android/dev-client.
  React.useEffect(() => {
    if (!CAN_USE_GOOGLE_AUTH) return;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // Native Google sign-in handler using @react-native-google-signin/google-signin
  const handleGoogleLogin = async () => {
    if (IS_EXPO_GO) {
      Alert.alert(
        'Google Sign-in',
        'Google sign-in requires a dev build (not Expo Go). You can still use email/password in Expo Go.'
      );
      return;
    }

    if (!GOOGLE_AUTH_ENABLED) {
      Alert.alert(
        'Google Sign-in',
        'Google sign-in is disabled. Enable it by setting EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=true in your dev build env.'
      );
      return;
    }

    if (!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Google Sign-in', 'Missing Google client IDs in .env');
      return;
    }

    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Force account picker (avoid reusing previously selected Google account)
      try {
        await GoogleSignin.signOut();
      } catch {
        // ignore
      }

      const userInfo = await GoogleSignin.signIn();
      console.log('[GoogleSignin][Login] userInfo keys=', Object.keys((userInfo as any) || {}));
      console.log('[GoogleSignin][Login] idToken=', (userInfo as any)?.idToken);
      console.log('[GoogleSignin][Login] data.idToken=', (userInfo as any)?.data?.idToken);

      const idToken = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
      if (!idToken) {
        Alert.alert('Google Sign-in Failed', 'Missing id token from Google.');
        return;
      }

      // Sign in to Firebase with Google id_token
      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      const firebaseIdToken = await userCred.user.getIdToken();

      // Exchange Firebase ID token for your backend JWT
      const res = await axios.post(
        `${API_URL}/login`,
        { provider: 'google', idToken: firebaseIdToken },
        { timeout: 10000 }
      );

      if (res.data.success) {
        const { token, user } = res.data;

        if (user?.isActive === false) {
          setServerError({ field: 'email', message: 'Account is deactivated' });
          Alert.alert('Account Inactive', 'Your account has been deactivated. Please contact support.');
          return;
        }

        await setItem('authToken', token);
        await setItem('user', JSON.stringify(user));
        await registerFirebasePushToken(API_URL, token).catch(() => null);

        setSuccessMessage('Login successful!');
        setTimeout(() => {
          try {
            const role = user?.role || (typeof user === 'string' ? JSON.parse(user).role : undefined);
            router.replace(role === 'admin' ? '/(admin)/dashboard' : '/(tabs)');
          } catch {
            router.replace('/(tabs)');
          }
        }, 1200);
      }
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Google login failed';
      Alert.alert('Google Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setServerError({});
    setSuccessMessage('');
    if (!validateForm()) return;
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/login`, { email, password }, { timeout: 10000 });
      if (res.data.success) {
        const { token, user } = res.data;

        if (user?.isActive === false) {
          setServerError({ field: 'email', message: 'Account is deactivated' });
          Alert.alert('Account Inactive', 'Your account has been deactivated. Please contact support.');
          return;
        }

        try {
          await setItem('authToken', token);
          await setItem('user', JSON.stringify(user));
          await registerFirebasePushToken(API_URL, token).catch(() => null);
        } catch (err) {
          console.error('Storage error:', err);
        }
        setSuccessMessage('Login successful!');
        setTimeout(() => {
          try {
            const role = user?.role || (typeof user === 'string' ? JSON.parse(user).role : undefined);
            router.replace(role === 'admin' ? '/(admin)/dashboard' : '/(tabs)');
          } catch {
            router.replace('/(tabs)');
          }
        }, 1200);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Login failed';
      const statusCode = err?.response?.status;
      if (statusCode === 404 || message.toLowerCase().includes('user not found')) {
        setServerError({ field: 'email', message: 'No account found with this email' });
        Alert.alert('Login Failed', 'No account found with this email.');
      } else if (statusCode === 401 || message.toLowerCase().includes('password')) {
        setServerError({ field: 'password', message: 'Incorrect password' });
        Alert.alert('Login Failed', 'Incorrect password. Please try again.');
      } else if (statusCode === 403 || message.toLowerCase().includes('deactiv')) {
        setServerError({ field: 'email', message: 'Account is deactivated' });
        Alert.alert('Account Inactive', 'Your account has been deactivated. Please contact support.');
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Brand ── */}
        <View style={s.brandWrap}>
          <View style={s.robotBadge}>
            <CarIcon />
          </View>
          <Text style={s.brandTitle}>DRIFT N' DASH</Text>
          <Text style={s.brandSub}>Your premium hot wheels shopping destination</Text>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>

          {/* Success */}
          {!!successMessage && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#996250" />
              <Text style={s.successText}> {successMessage}</Text>
            </View>
          )}

          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.cardSub}>Sign in to your account</Text>

          <View style={s.divider} />

          {/* Email */}
          <InputField
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: undefined }); setServerError({}); }}
            keyboardType="email-address"
            editable={!loading}
            error={errors.email || (serverError.field === 'email' ? serverError.message : undefined)}
            leftIcon={<Feather name="mail" size={17} color="rgba(153,98,80,0.6)" />}
          />

          {/* Password */}
          <InputField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: undefined }); setServerError({}); }}
            secureTextEntry={!showPassword}
            editable={!loading}
            error={errors.password || (serverError.field === 'password' ? serverError.message : undefined)}
            leftIcon={<Feather name="lock" size={17} color="rgba(153,98,80,0.6)" />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={17}
                  color="rgba(153,98,80,0.6)"
                />
              </TouchableOpacity>
            }
          />

          {/* Forgot */}
          <TouchableOpacity style={s.forgotWrap} activeOpacity={0.7}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.loginBtn, loading && s.disabledBtn]}
              onPress={handleLogin}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#F9F9F9" />
              ) : (
                <>
                  <Text style={s.loginBtnText}>Sign In</Text>
                  <Feather name="arrow-right" size={18} color="#F9F9F9" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* OR divider */}
          <View style={s.orDivider}>
            <View style={s.orLine} />
            <Text style={s.orText}>or continue with</Text>
            <View style={s.orLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={s.socialBtn} disabled={loading} activeOpacity={0.8} onPress={handleGoogleLogin}>
            <View style={s.socialLogoWrap}>
              <GoogleLogo />
            </View>
            <Text style={s.socialText}>Continue with Google</Text>
          </TouchableOpacity>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={loading}>
            <Text style={s.registerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Admin pill */}
        <TouchableOpacity style={s.adminPill} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-crown-outline" size={13} color="rgba(153,98,80,0.85)" />
          <Text style={s.adminPillText}> Admin access available</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a0204',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 52,
    justifyContent: 'center',
  },

  // ── Brand ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  robotBadge: {
    width: 100,
    height: 68,
    backgroundColor: '#2a0508',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,0,7,0.5)',
    shadowColor: '#800007',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9F9F9',
    letterSpacing: 3,
    marginBottom: 5,
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(153,98,80,0.7)',
    letterSpacing: 0.6,
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(249,249,249,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(153,98,80,0.18)',
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9F9F9',
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 13,
    color: 'rgba(153,98,80,0.75)',
    marginBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(153,98,80,0.15)',
    marginBottom: 22,
  },

  // ── Success ──
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(153,98,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(153,98,80,0.45)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  successText: {
    color: '#996250',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // ── Eye ──
  eyeBtn: { padding: 4, marginLeft: 6 },

  // ── Forgot ──
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 22,
  },
  forgotText: {
    color: '#996250',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Login button ──
  loginBtn: {
    backgroundColor: '#800007',
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#800007',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  disabledBtn: { opacity: 0.6 },
  loginBtnText: {
    color: '#F9F9F9',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // ── OR divider ──
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(153,98,80,0.15)',
  },
  orText: {
    color: 'rgba(153,98,80,0.55)',
    fontSize: 12,
    marginHorizontal: 12,
    letterSpacing: 0.4,
  },

  // ── Social ──
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,249,249,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(153,98,80,0.2)',
    borderRadius: 13,
    paddingVertical: 13,
  },
  socialLogoWrap: { marginRight: 10 },
  socialText: {
    color: 'rgba(249,249,249,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'rgba(153,98,80,0.65)',
    fontSize: 13,
  },
  registerLink: {
    color: '#996250',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Admin pill ──
  adminPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,0,7,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(128,0,7,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 16,
  },
  adminPillText: {
    color: 'rgba(153,98,80,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
});

async function extractGoogleIdToken(userInfo: any): Promise<string | null> {
  // Different versions / platforms can return different shapes.
  // We also try getTokens() as a fallback.
  const direct = userInfo?.idToken ?? userInfo?.data?.idToken ?? userInfo?.user?.idToken;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  try {
    const tokens = await GoogleSignin.getTokens();
    const fallback = (tokens as any)?.idToken;
    if (typeof fallback === 'string' && fallback.length > 0) return fallback;
  } catch {
    // ignore
  }

  return null;
}