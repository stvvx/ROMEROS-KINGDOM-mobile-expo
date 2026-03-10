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
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { setItem } from '@/utils/storage';
import { registerFirebasePushToken } from '@/utils/notifications';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';

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
    <Path d="M32 4 L32 12" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round"/>
    <Rect x="29" y="2" width="6" height="6" rx="3" fill="#ffca28"/>
    <Rect x="12" y="12" width="40" height="22" rx="6" fill="#2280b0"/>
    <Rect x="18" y="19" width="10" height="8" rx="3" fill="#1a1a2e"/>
    <Rect x="36" y="19" width="10" height="8" rx="3" fill="#1a1a2e"/>
    <Rect x="20" y="21" width="4" height="4" rx="2" fill="#4caf50"/>
    <Rect x="38" y="21" width="4" height="4" rx="2" fill="#4caf50"/>
    <Rect x="19" y="30" width="26" height="4" rx="2" fill="#16213e"/>
    <Rect x="21" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    <Rect x="27" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    <Rect x="33" y="31" width="4" height="2" rx="1" fill="#ffca28"/>
    <Rect x="39" y="31" width="4" height="2" rx="1" fill="#4caf50"/>
    <Rect x="28" y="34" width="8" height="4" rx="2" fill="#16213e"/>
    <Rect x="10" y="38" width="44" height="20" rx="5" fill="#2280b0"/>
    <Rect x="20" y="42" width="24" height="12" rx="3" fill="#16213e"/>
    <Rect x="24" y="45" width="6" height="6" rx="3" fill="#2280b0"/>
    <Rect x="26" y="47" width="2" height="2" rx="1" fill="#4caf50"/>
    <Rect x="34" y="45" width="4" height="3" rx="1.5" fill="#ffca28"/>
    <Rect x="34" y="50" width="4" height="3" rx="1.5" fill="#2280b0" opacity="0.6"/>
    <Rect x="2"  y="39" width="8" height="14" rx="4" fill="#16213e"/>
    <Rect x="54" y="39" width="8" height="14" rx="4" fill="#16213e"/>
    <Rect x="14" y="57" width="14" height="6" rx="3" fill="#16213e"/>
    <Rect x="36" y="57" width="14" height="6" rx="3" fill="#16213e"/>
  </Svg>
);

// ─── Input Field Component ────────────────────────────────────
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
  group: { marginBottom: 16 },
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

// ─── Form Errors Interface ────────────────────────────────────
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ─── Main Register Screen ─────────────────────────────────────
export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = 'Full name is required';
    else if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Must be at least 6 characters';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return false;

    if (!agreedToTerms) {
      setShowTermsModal(true);
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    setSuccessMessage('');
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/register`,
        { name, email, password },
        { timeout: 10000 }
      );

      if (res.data.success) {
        const { token, user } = res.data;
        try {
          await setItem('authToken', token);
          await setItem('user', JSON.stringify(user));
          await registerFirebasePushToken(API_URL, token).catch(() => null);
        } catch (err) {
          console.error('Error storing token/user:', err);
        }
        setSuccessMessage('Account created successfully!');
        setTimeout(() => {
          router.replace('/(user)/UserProfile');
        }, 1500);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Registration failed';
      const statusCode = err?.response?.status;
      console.error('[Register] Error:', message, 'Status:', statusCode);

      const isEmailTaken =
        statusCode === 409 ||
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('exists') ||
        message.toLowerCase().includes('registered') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('in use');

      if (isEmailTaken) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already registered. Try signing in instead.',
        }));
      } else {
        Alert.alert('Registration Failed', message);
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
      {/* ── Custom Terms Modal ── */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowTermsModal(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            {/* Icon */}
            <View style={s.modalIconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={32} color="#ffca28" />
            </View>

            {/* Title */}
            <Text style={s.modalTitle}>Terms Required</Text>
            <Text style={s.modalSubtitle}>
              You need to accept our Terms & Conditions and Privacy Policy before creating your account.
            </Text>

            {/* Divider */}
            <View style={s.modalDivider} />

            {/* Accept button */}
            <TouchableOpacity
              style={s.modalAcceptBtn}
              onPress={() => {
                setAgreedToTerms(true);
                setShowTermsModal(false);
              }}
              activeOpacity={0.85}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={s.modalAcceptText}>  I Accept the Terms</Text>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity
              style={s.modalDismissBtn}
              onPress={() => setShowTermsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={s.modalDismissText}>Maybe Later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

          {/* Success Banner */}
          {!!successMessage && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
              <Text style={s.successText}> {successMessage}</Text>
            </View>
          )}

          <Text style={s.cardTitle}>Create Account</Text>
          <Text style={s.cardSub}>Join us and start shopping</Text>

          <View style={s.divider} />

          {/* Full Name */}
          <InputField
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={(t) => { setName(t); setErrors({ ...errors, name: undefined }); }}
            autoCapitalize="words"
            editable={!loading}
            error={errors.name}
            leftIcon={<Feather name="user" size={17} color="rgba(160,174,192,0.55)" />}
          />

          {/* Email */}
          <InputField
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: undefined }); }}
            keyboardType="email-address"
            editable={!loading}
            error={errors.email}
            leftIcon={<Feather name="mail" size={17} color="rgba(160,174,192,0.55)" />}
          />

          {/* Password */}
          <InputField
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: undefined }); }}
            secureTextEntry={!showPassword}
            editable={!loading}
            error={errors.password}
            leftIcon={<Feather name="lock" size={17} color="rgba(160,174,192,0.55)" />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={17} color="rgba(160,174,192,0.55)" />
              </TouchableOpacity>
            }
          />

          {/* Confirm Password */}
          <InputField
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setErrors({ ...errors, confirmPassword: undefined }); }}
            secureTextEntry={!showConfirmPassword}
            editable={!loading}
            error={errors.confirmPassword}
            leftIcon={<Feather name="shield" size={17} color="rgba(160,174,192,0.55)" />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={17} color="rgba(160,174,192,0.55)" />
              </TouchableOpacity>
            }
          />

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={[s.termsRow, !agreedToTerms && errors.name !== undefined && s.termsRowError]}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
              {agreedToTerms && (
                <Feather name="check" size={12} color="#fff" />
              )}
            </View>
            <Text style={s.termsText}>
              I agree to the{' '}
              <Text style={s.termsLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Create Account button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.registerBtn, loading && s.disabledBtn]}
              onPress={handleRegister}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={s.registerBtnText}>Create Account</Text>
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
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={loading}>
            <Text style={s.loginLink}>Sign in</Text>
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
    paddingVertical: 48,
    justifyContent: 'center',
  },

  // ── Brand ──
  brandWrap: {
    alignItems: 'center',
    marginBottom: 26,
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
    marginBottom: 20,
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

  // ── Terms ──
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    marginTop: 4,
  },
  termsRowError: {
    // subtle indicator when terms not accepted and form submitted
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(160,174,192,0.7)',
    lineHeight: 20,
  },
  termsLink: {
    color: '#2280b0',
    fontWeight: '600',
  },

  // ── Register button ──
  registerBtn: {
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
  registerBtnText: {
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
  loginLink: {
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

  // ── Terms Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,202,40,0.25)',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,202,40,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,202,40,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(160,174,192,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },
  modalAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    borderRadius: 13,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  modalAcceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalDismissBtn: {
    paddingVertical: 8,
  },
  modalDismissText: {
    color: 'rgba(160,174,192,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
});