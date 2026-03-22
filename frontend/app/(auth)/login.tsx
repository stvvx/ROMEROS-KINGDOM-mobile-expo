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
import Svg, { Path, Rect, Circle, Line, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
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

const GOOGLE_ANDROID_PACKAGE = 'romeroskingdom.ph';

const { width } = Dimensions.get('window');

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

// ─── Palette ──────────────────────────────────────────────────
// Deep navy base, electric cyan accent, steel blue mid-tones
const C = {
  bg:          '#020B18',       // near-black navy
  surface:     '#040F1F',       // card dark
  borderDim:   'rgba(0,168,255,0.18)',
  borderBright:'rgba(0,168,255,0.65)',
  accent:      '#00A8FF',       // electric cyan-blue
  accentGlow:  'rgba(0,168,255,0.35)',
  accentDeep:  '#005A8E',
  steelBlue:   '#1E3A5F',
  textPrimary: '#E8F4FF',
  textMuted:   'rgba(120,180,230,0.6)',
  textDim:     'rgba(80,140,200,0.45)',
  error:       '#FF4060',
  success:     '#00D4AA',
  panel:       'rgba(0,168,255,0.05)',
};

// ─── Google Logo SVG ──────────────────────────────────────────
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </Svg>
);

// ─── Robotic Car / Mech-Bot Icon ──────────────────────────────
const RoboCarIcon = () => (
  <Svg width={64} height={52} viewBox="0 0 140 90" fill="none">
    {/* Chassis base */}
    <Path d="M12 58 Q12 70 24 70 L116 70 Q128 70 128 58 L128 50 L12 50 Z" fill={C.steelBlue} />
    {/* Body accent stripe */}
    <Rect x="12" y="54" width="116" height="3" fill={C.accent} opacity="0.6" rx="1" />
    {/* Cabin shell */}
    <Path d="M34 50 Q38 28 50 20 Q62 13 70 13 Q82 13 94 20 Q106 28 108 50 Z" fill={C.steelBlue} />
    {/* Cabin outline glow */}
    <Path d="M34 50 Q38 28 50 20 Q62 13 70 13 Q82 13 94 20 Q106 28 108 50 Z"
      stroke={C.accent} strokeWidth="1.2" fill="none" opacity="0.8" />
    {/* Front windshield */}
    <Path d="M90 50 Q94 33 100 24 Q105 19 108 22 L108 50 Z" fill="#0A1E35" opacity="0.9" />
    <Path d="M90 50 Q94 33 100 24 Q105 19 108 22 L108 50 Z"
      stroke={C.accent} strokeWidth="0.8" fill="none" opacity="0.5" />
    {/* Rear window */}
    <Path d="M34 50 Q36 32 44 22 Q48 17 54 15 L62 13 Q60 24 58 50 Z" fill="#0A1E35" opacity="0.9" />
    <Path d="M34 50 Q36 32 44 22 Q48 17 54 15 L62 13 Q60 24 58 50 Z"
      stroke={C.accent} strokeWidth="0.8" fill="none" opacity="0.5" />
    {/* Center window */}
    <Path d="M60 50 Q62 22 67 14 Q76 12 86 18 Q92 28 92 50 Z" fill="#0A1E35" opacity="0.85" />
    <Path d="M60 50 Q62 22 67 14 Q76 12 86 18 Q92 28 92 50 Z"
      stroke={C.accent} strokeWidth="0.8" fill="none" opacity="0.5" />
    {/* Roofline highlight */}
    <Path d="M50 20 Q70 10 94 20" stroke={C.accent} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
    {/* Body crease */}
    <Path d="M14 55 Q70 51 126 55" stroke={C.accent} strokeWidth="1" fill="none" opacity="0.4" />
    {/* Front headlight — LED bar */}
    <Rect x="112" y="46" width="12" height="5" rx="2.5" fill={C.accent} opacity="0.95" />
    <Rect x="112" y="46" width="12" height="5" rx="2.5" fill={C.accent} opacity="0.4" />
    {/* Rear taillight */}
    <Rect x="16" y="46" width="10" height="5" rx="2.5" fill="#0040FF" opacity="0.85" />
    {/* Front bumper */}
    <Path d="M116 70 Q128 70 130 64 Q131 60 128 58 L128 70 Z" fill={C.accentDeep} />
    {/* Rear bumper */}
    <Path d="M24 70 Q12 70 10 64 Q9 60 12 58 L12 70 Z" fill={C.accentDeep} />
    {/* Front wheel arch */}
    <Path d="M96 70 Q96 83 108 83 Q120 83 120 70 Z" fill="#010810" />
    {/* Front wheel */}
    <Circle cx="108" cy="73" r="10" fill="#020D20" stroke={C.accent} strokeWidth="1.2" />
    {/* Front rim spokes */}
    <Line x1="108" y1="63" x2="108" y2="83" stroke={C.accent} strokeWidth="1" opacity="0.7" />
    <Line x1="98" y1="73" x2="118" y2="73" stroke={C.accent} strokeWidth="1" opacity="0.7" />
    <Line x1="101" y1="66" x2="115" y2="80" stroke={C.accent} strokeWidth="0.8" opacity="0.5" />
    <Line x1="115" y1="66" x2="101" y2="80" stroke={C.accent} strokeWidth="0.8" opacity="0.5" />
    <Circle cx="108" cy="73" r="3" fill={C.accent} opacity="0.9" />
    {/* Rear wheel arch */}
    <Path d="M20 70 Q20 83 32 83 Q44 83 44 70 Z" fill="#010810" />
    {/* Rear wheel */}
    <Circle cx="32" cy="73" r="10" fill="#020D20" stroke={C.accent} strokeWidth="1.2" />
    {/* Rear rim spokes */}
    <Line x1="32" y1="63" x2="32" y2="83" stroke={C.accent} strokeWidth="1" opacity="0.7" />
    <Line x1="22" y1="73" x2="42" y2="73" stroke={C.accent} strokeWidth="1" opacity="0.7" />
    <Line x1="25" y1="66" x2="39" y2="80" stroke={C.accent} strokeWidth="0.8" opacity="0.5" />
    <Line x1="39" y1="66" x2="25" y2="80" stroke={C.accent} strokeWidth="0.8" opacity="0.5" />
    <Circle cx="32" cy="73" r="3" fill={C.accent} opacity="0.9" />
    {/* Robotic sensor array on roof */}
    <Rect x="62" y="8" width="16" height="6" rx="3" fill={C.accentDeep} stroke={C.accent} strokeWidth="0.8" />
    <Circle cx="70" cy="11" r="2" fill={C.accent} opacity="0.9" />
    {/* Circuit-like door detail */}
    <Path d="M64 52 L76 52 L76 47 L80 47" stroke={C.accent} strokeWidth="0.7" fill="none" opacity="0.55" />
    <Circle cx="64" cy="52" r="1.2" fill={C.accent} opacity="0.7" />
    <Circle cx="80" cy="47" r="1.2" fill={C.accent} opacity="0.7" />
  </Svg>
);

// ─── Circuit corner decoration ─────────────────────────────────
const CircuitCorner = ({ flip }: { flip?: boolean }) => (
  <Svg
    width={40} height={40}
    viewBox="0 0 40 40"
    style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}
  >
    <Path d="M2 38 L2 12 Q2 2 12 2 L38 2" stroke={C.accent} strokeWidth="1.2" fill="none" opacity="0.5" />
    <Circle cx="2" cy="38" r="2.5" fill={C.accent} opacity="0.7" />
    <Circle cx="38" cy="2" r="2.5" fill={C.accent} opacity="0.7" />
    <Circle cx="12" cy="2" r="1.5" fill={C.accentDeep} opacity="0.9" />
    <Rect x="18" y="0" width="8" height="4" rx="1" fill={C.accentDeep} />
    <Rect x="0" y="20" width="4" height="8" rx="1" fill={C.accentDeep} />
  </Svg>
);

// ─── Input Field Component ─────────────────────────────────────
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
      {/* Label with scan-line tick */}
      <View style={inp.labelRow}>
        <View style={inp.labelTick} />
        <Text style={inp.label}>{label}</Text>
      </View>
      <View style={[
        inp.wrap,
        focused && inp.wrapFocused,
        !!error && inp.wrapError,
      ]}>
        {/* Left bracket accent */}
        <View style={inp.bracket} />
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
          placeholderTextColor={C.textDim}
        />
        {rightElement}
      </View>
      {!!error && (
        <View style={inp.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={C.error} />
          <Text style={inp.errorText}> {error}</Text>
        </View>
      )}
    </View>
  );
};

const inp = StyleSheet.create({
  group:    { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 2 },
  labelTick:{
    width: 2, height: 10,
    backgroundColor: C.accent,
    borderRadius: 1,
    marginRight: 7,
    opacity: 0.85,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    overflow: 'hidden',
  },
  bracket: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: C.accentDeep,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  wrapFocused: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0,168,255,0.08)',
  },
  wrapError: {
    borderColor: C.error,
    backgroundColor: 'rgba(255,64,96,0.06)',
  },
  iconWrap:  { marginRight: 10, marginLeft: 4 },
  input: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 15,
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  errorRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 2 },
  errorText: { color: C.error, fontSize: 12, fontWeight: '500' },
});

// ─── Main Login Screen ────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPassword,setShowPassword]= useState(false);
  const [errors,      setErrors]      = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<{ field?: string; message?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    if (!CAN_USE_GOOGLE_AUTH) return;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (IS_EXPO_GO) {
      Alert.alert('Google Sign-in', 'Google sign-in requires a dev build (not Expo Go). You can still use email/password in Expo Go.');
      return;
    }
    if (!GOOGLE_AUTH_ENABLED) {
      Alert.alert('Google Sign-in', 'Google sign-in is disabled. Enable it by setting EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=true in your dev build env.');
      return;
    }
    if (!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Google Sign-in', 'Missing Google client IDs in .env');
      return;
    }
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await GoogleSignin.signOut(); } catch { }
      const userInfo = await GoogleSignin.signIn();
      const idToken  = (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken;
      if (!idToken) { Alert.alert('Google Sign-in Failed', 'Missing id token from Google.'); return; }
      const credential     = GoogleAuthProvider.credential(idToken);
      const userCred       = await signInWithCredential(auth, credential);
      const firebaseIdToken= await userCred.user.getIdToken();
      const res = await axios.post(`${API_URL}/login`, { provider: 'google', idToken: firebaseIdToken }, { timeout: 10000 });
      if (res.data.success) {
        const { token, user } = res.data;
        if (user?.isActive === false) { setServerError({ field: 'email', message: 'Account is deactivated' }); Alert.alert('Account Inactive', 'Your account has been deactivated.'); return; }
        await setItem('authToken', token);
        await setItem('user', JSON.stringify(user));
        await registerFirebasePushToken(API_URL, token).catch(() => null);
        setSuccessMessage('AUTHENTICATION SUCCESSFUL');
        setTimeout(() => {
          try { const role = user?.role; router.replace(role === 'admin' ? '/(admin)/dashboard' : '/(tabs)'); }
          catch { router.replace('/(tabs)'); }
        }, 1200);
      }
    } catch (e: any) {
      Alert.alert('Google Login Failed', mapGoogleSignInErrorMessage(e));
    } finally { setLoading(false); }
  };

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start();
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
        if (user?.isActive === false) { setServerError({ field: 'email', message: 'Account is deactivated' }); Alert.alert('Account Inactive', 'Your account has been deactivated.'); return; }
        try {
          await setItem('authToken', token);
          await setItem('user', JSON.stringify(user));
          await registerFirebasePushToken(API_URL, token).catch(() => null);
        } catch (err) { console.error('Storage error:', err); }
        setSuccessMessage('AUTHENTICATION SUCCESSFUL');
        setTimeout(() => {
          try { const role = user?.role; router.replace(role === 'admin' ? '/(admin)/dashboard' : '/(tabs)'); }
          catch { router.replace('/(tabs)'); }
        }, 1200);
      }
    } catch (err: any) {
      const message    = err?.response?.data?.message || err?.message || 'Login failed';
      const statusCode = err?.response?.status;
      if (statusCode === 404 || message.toLowerCase().includes('user not found')) {
        setServerError({ field: 'email', message: 'No account found with this email' });
        Alert.alert('Login Failed', 'No account found with this email.');
      } else if (statusCode === 401 || message.toLowerCase().includes('password')) {
        setServerError({ field: 'password', message: 'Incorrect password' });
        Alert.alert('Login Failed', 'Incorrect password. Please try again.');
      } else if (statusCode === 403 || message.toLowerCase().includes('deactiv')) {
        setServerError({ field: 'email', message: 'Account is deactivated' });
        Alert.alert('Account Inactive', 'Your account has been deactivated.');
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally { setLoading(false); }
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

        {/* ── Scan-line texture strips ── */}
        <View style={s.scanLinesTop} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={s.scanLine} />
          ))}
        </View>

        {/* ── Brand ── */}
        <View style={s.brandWrap}>
          {/* Robotic frame badge */}
          <View style={s.badgeOuter}>
            <View style={s.badgeInner}>
              <RoboCarIcon />
              {/* Blinking status indicator */}
              <View style={s.statusDot} />
            </View>
            {/* Corner circuits */}
            <View style={[s.corner, s.cornerTL]}><CircuitCorner /></View>
            <View style={[s.corner, s.cornerTR]}><CircuitCorner flip /></View>
          </View>

          {/* System tag line above title */}
          <View style={s.sysTagRow}>
            <View style={s.sysDash} />
            <Text style={s.sysTag}>UNIT-7 MOBILITY OS v2.4</Text>
            <View style={s.sysDash} />
          </View>

          <Text style={s.brandTitle}>ROMEROS KINGDOM</Text>
          <Text style={s.brandSub}>AUTONOMOUS HOT WHEELS COMMAND CENTER</Text>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>
          {/* Top corner decoration */}
          <View style={s.cardTL} />
          <View style={s.cardTR} />
          <View style={s.cardBL} />
          <View style={s.cardBR} />

          {/* Success */}
          {!!successMessage && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={s.successText}>  {successMessage}</Text>
            </View>
          )}

          {/* Header */}
          <Text style={s.cardTitle}>ACCESS TERMINAL</Text>
          <Text style={s.cardSub}>INPUT CREDENTIALS TO AUTHENTICATE</Text>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <View style={s.dividerDot} />
            <View style={s.dividerLine} />
          </View>

          {/* Email */}
          <InputField
            label="User ID — Email"
            placeholder="operator@system.io"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: undefined }); setServerError({}); }}
            keyboardType="email-address"
            editable={!loading}
            error={errors.email || (serverError.field === 'email' ? serverError.message : undefined)}
            leftIcon={<Feather name="cpu" size={16} color={C.accent} />}
          />

          {/* Password */}
          <InputField
            label="Auth Key — Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: undefined }); setServerError({}); }}
            secureTextEntry={!showPassword}
            editable={!loading}
            error={errors.password || (serverError.field === 'password' ? serverError.message : undefined)}
            leftIcon={<Feather name="shield" size={16} color={C.accent} />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color={C.textMuted} />
              </TouchableOpacity>
            }
          />

          {/* Forgot */}
          <TouchableOpacity style={s.forgotWrap} activeOpacity={0.7}>
            <Feather name="alert-triangle" size={11} color={C.accent} style={{ marginRight: 5 }} />
            <Text style={s.forgotText}>RESET AUTH KEY</Text>
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
              {/* Button scan bar */}
              <View style={s.btnScanBar} />
              {loading ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <>
                  <Feather name="zap" size={16} color={C.bg} style={{ marginRight: 8 }} />
                  <Text style={s.loginBtnText}>INITIALIZE SESSION</Text>
                  <Feather name="arrow-right" size={16} color={C.bg} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* OR divider */}
          <View style={s.orDivider}>
            <View style={s.orLine} />
            <Text style={s.orText}>[ ALT PROTOCOL ]</Text>
            <View style={s.orLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={s.socialBtn} disabled={loading} activeOpacity={0.8} onPress={handleGoogleLogin}>
            <View style={s.socialLeftBar} />
            <View style={s.socialLogoWrap}><GoogleLogo /></View>
            <Text style={s.socialText}>SYNC VIA GOOGLE NETWORK</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>NO PROFILE REGISTERED?  </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={loading}>
            <Text style={s.registerLink}>[ ENROLL NOW ]</Text>
          </TouchableOpacity>
        </View>

        {/* Admin pill */}
        <TouchableOpacity style={s.adminPill} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-crown-outline" size={13} color={C.accent} />
          <Text style={s.adminPillText}>  ADMIN OVERRIDE AVAILABLE</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 52,
    justifyContent: 'center',
  },

  // ── Scan lines overlay ──
  scanLinesTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 120,
    opacity: 0.06,
    gap: 12,
  },
  scanLine: {
    height: 1,
    backgroundColor: C.accent,
  },

  // ── Brand ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  badgeOuter: {
    marginBottom: 16,
    position: 'relative',
    width: 140,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 120,
    height: 90,
    backgroundColor: C.surface,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.borderBright,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  statusDot: {
    position: 'absolute',
    top: 8, right: 8,
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: C.success,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  corner: {
    position: 'absolute',
  },
  cornerTL: { top: 0, left: 0 },
  cornerTR: { top: 0, right: 0 },

  sysTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sysDash: {
    width: 20, height: 1,
    backgroundColor: C.accent,
    opacity: 0.4,
    marginHorizontal: 8,
  },
  sysTag: {
    fontSize: 9,
    color: C.accent,
    letterSpacing: 1.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    opacity: 0.75,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 4,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  brandSub: {
    fontSize: 9,
    color: C.textMuted,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(4,15,31,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 26,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 14,
    overflow: 'visible',
  },
  // Mechanical corner accents
  cardTL: {
    position: 'absolute', top: -1, left: -1,
    width: 16, height: 16,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: C.accent,
    borderTopLeftRadius: 16,
  },
  cardTR: {
    position: 'absolute', top: -1, right: -1,
    width: 16, height: 16,
    borderTopWidth: 2, borderRightWidth: 2,
    borderColor: C.accent,
    borderTopRightRadius: 16,
  },
  cardBL: {
    position: 'absolute', bottom: -1, left: -1,
    width: 16, height: 16,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderColor: C.accent,
    borderBottomLeftRadius: 16,
  },
  cardBR: {
    position: 'absolute', bottom: -1, right: -1,
    width: 16, height: 16,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: C.accent,
    borderBottomRightRadius: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 3,
    letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardSub: {
    fontSize: 9,
    color: C.textMuted,
    marginBottom: 18,
    letterSpacing: 1.4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.borderDim,
  },
  dividerDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginHorizontal: 8,
    opacity: 0.8,
  },

  // ── Success ──
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  successText: {
    color: C.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Eye ──
  eyeBtn: { padding: 4, marginLeft: 6 },

  // ── Forgot ──
  forgotWrap: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 22,
  },
  forgotText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Login button ──
  loginBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  btnScanBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  disabledBtn: { opacity: 0.5 },
  loginBtnText: {
    color: C.bg,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── OR divider ──
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1, height: 1,
    backgroundColor: C.borderDim,
  },
  orText: {
    color: C.textDim,
    fontSize: 9,
    marginHorizontal: 10,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Social ──
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 10,
    paddingVertical: 13,
    overflow: 'hidden',
  },
  socialLeftBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: C.accentDeep,
  },
  socialLogoWrap: { marginRight: 10 },
  socialText: {
    color: C.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: C.textDim,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 0.8,
  },
  registerLink: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Admin pill ──
  adminPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,168,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,168,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 16,
  },
  adminPillText: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

async function extractGoogleIdToken(userInfo: any): Promise<string | null> {
  const direct = userInfo?.idToken ?? userInfo?.data?.idToken ?? userInfo?.user?.idToken;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  try {
    const tokens  = await GoogleSignin.getTokens();
    const fallback = (tokens as any)?.idToken;
    if (typeof fallback === 'string' && fallback.length > 0) return fallback;
  } catch { }
  return null;
}

function mapGoogleSignInErrorMessage(error: any): string {
  const code = error?.code;
  if (code === 'DEVELOPER_ERROR' || String(error?.message || '').includes('DEVELOPER_ERROR')) {
    return [
      'Google OAuth config mismatch detected.',
      `Firebase Android app package must be ${GOOGLE_ANDROID_PACKAGE}.`,
      'Add the SHA-1 fingerprint of your build keystore in Firebase (Project Settings > Your apps > Android).',
      'Then download a new google-services.json and rebuild the Android app.',
      'Local SHA-1 command: keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android',
    ].join('\n');
  }

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is missing or outdated on this device.';
  }

  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return 'Google sign-in was cancelled.';
  }

  if (code === statusCodes.IN_PROGRESS) {
    return 'Google sign-in is already in progress. Please wait and try again.';
  }

  return error?.response?.data?.message || error?.message || 'Google login failed';
}