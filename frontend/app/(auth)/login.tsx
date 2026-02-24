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
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';

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

// ─── Robot SVG Icon ───────────────────────────────────────────
const RobotIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 64 64" fill="none">
    {/* Antenna */}
    <Path d="M32 4 L32 12" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round"/>
    <Rect x="29" y="2" width="6" height="6" rx="3" fill="#ffca28"/>
    {/* Head */}
    <Rect x="12" y="12" width="40" height="22" rx="6" fill="#2280b0"/>
    {/* Eyes */}
    <Rect x="18" y="19" width="10" height="8" rx="3" fill="#1a1a2e"/>
    <Rect x="36" y="19" width="10" height="8" rx="3" fill="#1a1a2e"/>
    {/* Eye glow */}
    <Rect x="20" y="21" width="4" height="4" rx="2" fill="#4caf50"/>
    <Rect x="38" y="21" width="4" height="4" rx="2" fill="#4caf50"/>
    {/* Mouth panel */}
    <Rect x="19" y="30" width="26" height="4" rx="2" fill="#16213e"/>
    <Rect x="21" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    <Rect x="27" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    <Rect x="33" y="31" width="4" height="2" rx="1" fill="#ffca28"/>
    <Rect x="39" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    {/* Neck */}
    <Rect x="28" y="34" width="8" height="4" rx="2" fill="#16213e"/>
    {/* Body */}
    <Rect x="10" y="38" width="44" height="20" rx="5" fill="#2280b0"/>
    {/* Chest panel */}
    <Rect x="20" y="42" width="24" height="12" rx="3" fill="#16213e"/>
    {/* Chest light */}
    <Rect x="24" y="45" width="6" height="6" rx="3" fill="#2280b0"/>
    <Rect x="26" y="47" width="2" height="2" rx="1" fill="#4caf50"/>
    {/* Side buttons */}
    <Rect x="34" y="45" width="4" height="3" rx="1.5" fill="#ffca28"/>
    <Rect x="34" y="50" width="4" height="3" rx="1.5" fill="#2280b0" opacity="0.6"/>
    {/* Arms */}
    <Rect x="2"  y="39" width="8" height="14" rx="4" fill="#16213e"/>
    <Rect x="54" y="39" width="8" height="14" rx="4" fill="#16213e"/>
    {/* Feet */}
    <Rect x="14" y="57" width="14" height="6" rx="3" fill="#16213e"/>
    <Rect x="36" y="57" width="14" height="6" rx="3" fill="#16213e"/>
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
          placeholderTextColor="rgba(160,174,192,0.35)"
        />
        {rightElement}
      </View>
      {!!error && (
        <View style={inp.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#ff6b6b" />
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
    color: 'rgba(160,174,192,0.85)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  wrapFocused: {
    borderColor: '#2280b0',
    backgroundColor: 'rgba(34,128,176,0.08)',
  },
  wrapError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255,107,107,0.06)',
  },
  iconWrap: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#fff',
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
    color: '#ff6b6b',
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
            <RobotIcon />
          </View>
          <Text style={s.brandTitle}>ROMEROS KINGDOM</Text>
          <Text style={s.brandSub}>Your premium shopping destination</Text>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>

          {/* Success */}
          {!!successMessage && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
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
            leftIcon={<Feather name="mail" size={17} color="rgba(160,174,192,0.55)" />}
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
            leftIcon={<Feather name="lock" size={17} color="rgba(160,174,192,0.55)" />}
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
                  color="rgba(160,174,192,0.55)"
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={s.loginBtnText}>Sign In</Text>
                  <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
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
          <TouchableOpacity style={s.socialBtn} disabled={loading} activeOpacity={0.8}>
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
          <MaterialCommunityIcons name="shield-crown-outline" size={13} color="rgba(34,128,176,0.8)" />
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
    backgroundColor: '#1a1a2e',
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
    width: 78,
    height: 78,
    backgroundColor: '#16213e',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.35)',
    shadowColor: '#2280b0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2.5,
    marginBottom: 5,
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(160,174,192,0.55)',
    letterSpacing: 0.4,
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    elevation: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 13,
    color: 'rgba(160,174,192,0.65)',
    marginBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 22,
  },

  // ── Success ──
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  successText: {
    color: '#4caf50',
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
    color: '#2280b0',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Login button ──
  loginBtn: {
    backgroundColor: '#2280b0',
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2280b0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  disabledBtn: { opacity: 0.6 },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
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
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  orText: {
    color: 'rgba(160,174,192,0.5)',
    fontSize: 12,
    marginHorizontal: 12,
  },

  // ── Social ──
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13,
    paddingVertical: 13,
  },
  socialLogoWrap: { marginRight: 10 },
  socialText: {
    color: 'rgba(255,255,255,0.85)',
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
    color: 'rgba(160,174,192,0.65)',
    fontSize: 13,
  },
  registerLink: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Admin pill ──
  adminPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(34,128,176,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,128,176,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 16,
  },
  adminPillText: {
    color: 'rgba(34,128,176,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
});