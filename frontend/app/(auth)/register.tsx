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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Constants from 'expo-constants';
import { auth } from '@/utils/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_ENABLED =
  String(process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH || '').toLowerCase() === 'true';

const IS_EXPO_GO =
  (Constants as any)?.executionEnvironment === 'storeClient' ||
  (Constants as any)?.appOwnership === 'expo';

const CAN_USE_GOOGLE_AUTH = GOOGLE_AUTH_ENABLED && !IS_EXPO_GO;

const GOOGLE_ANDROID_PACKAGE = 'romeroskingdom.ph';

const API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

/* ─────────────────────────────────────────
   Palette — Blue Robotics
───────────────────────────────────────── */
const C = {
  bg:          '#020B18',
  surface:     '#040F1F',
  surfaceHigh: '#071828',
  border:      '#0D2440',
  borderBright:'rgba(0,168,255,0.55)',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.1)',
  accentText:  '#33BBFF',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.7)',
  textDim:     'rgba(60,110,170,0.45)',
  error:       '#FF4060',
  success:     '#00D4AA',
  panel:       'rgba(0,168,255,0.05)',
};

/* ─────────────────────────────────────────
   Google Logo SVG
───────────────────────────────────────── */
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </Svg>
);

/* ─────────────────────────────────────────
   Robot Head Icon SVG
───────────────────────────────────────── */
const RobotHeadIcon = ({ size = 48 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    {/* Neck */}
    <Rect x="17" y="35" width="10" height="5" rx="2" fill="#1E3A5F" />
    <Rect x="19" y="35" width="6" height="5" fill="#00A8FF" opacity="0.3" />
    {/* Head body */}
    <Rect x="5" y="10" width="34" height="26" rx="6" fill="#1E3A5F" />
    <Rect x="5" y="10" width="34" height="26" rx="6" fill="none" stroke="#00A8FF" strokeWidth="1.2" opacity="0.75" />
    {/* Forehead circuit trace */}
    <Line x1="12" y1="16" x2="32" y2="16" stroke="#00A8FF" strokeWidth="0.6" opacity="0.4" />
    <Circle cx="12" cy="16" r="1.2" fill="#00A8FF" opacity="0.65" />
    <Circle cx="32" cy="16" r="1.2" fill="#00A8FF" opacity="0.65" />
    <Circle cx="22" cy="16" r="1.2" fill="#00A8FF" opacity="0.45" />
    {/* Visor band */}
    <Rect x="9" y="20" width="26" height="9" rx="3" fill="#020D20" />
    <Rect x="9" y="20" width="26" height="9" rx="3" fill="none" stroke="#00A8FF" strokeWidth="0.8" opacity="0.6" />
    {/* Left eye */}
    <Rect x="12" y="22.5" width="8" height="4" rx="1.5" fill="#00A8FF" opacity="0.9" />
    <Circle cx="16" cy="24.5" r="1.2" fill="#E8F4FF" opacity="0.85" />
    {/* Right eye */}
    <Rect x="24" y="22.5" width="8" height="4" rx="1.5" fill="#00A8FF" opacity="0.9" />
    <Circle cx="28" cy="24.5" r="1.2" fill="#E8F4FF" opacity="0.85" />
    {/* Mouth grille */}
    <Rect x="14" y="32" width="3"  height="1.5" rx="0.7" fill="#00A8FF" opacity="0.55" />
    <Rect x="19" y="32" width="3"  height="1.5" rx="0.7" fill="#00A8FF" opacity="0.55" />
    <Rect x="24" y="32" width="3"  height="1.5" rx="0.7" fill="#00A8FF" opacity="0.55" />
    <Rect x="29" y="32" width="3"  height="1.5" rx="0.7" fill="#00A8FF" opacity="0.4"  />
    {/* Ear bolts */}
    <Circle cx="5"  cy="22" r="2.5" fill="#0A2035" stroke="#00A8FF" strokeWidth="1" opacity="0.85" />
    <Circle cx="5"  cy="22" r="0.9" fill="#00A8FF" opacity="0.8" />
    <Circle cx="39" cy="22" r="2.5" fill="#0A2035" stroke="#00A8FF" strokeWidth="1" opacity="0.85" />
    <Circle cx="39" cy="22" r="0.9" fill="#00A8FF" opacity="0.8" />
    {/* Antenna base */}
    <Rect x="20" y="6" width="4" height="5" rx="1.5" fill="#1E3A5F" stroke="#00A8FF" strokeWidth="0.8" opacity="0.9" />
    {/* Antenna tip — teal glow */}
    <Circle cx="22" cy="5" r="2" fill="#020D20" stroke="#00A8FF" strokeWidth="1" />
    <Circle cx="22" cy="5" r="1" fill="#00D4AA" opacity="0.95" />
    {/* Corner ticks */}
    <Path d="M5 14 L5 10 L9 10"    stroke="#00A8FF" strokeWidth="1" fill="none" opacity="0.7" strokeLinecap="round" />
    <Path d="M39 14 L39 10 L35 10" stroke="#00A8FF" strokeWidth="1" fill="none" opacity="0.7" strokeLinecap="round" />
  </Svg>
);

/* ─────────────────────────────────────────
   Input Field Component
───────────────────────────────────────── */
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
      <View style={inp.labelRow}>
        <View style={inp.labelTick} />
        <Text style={inp.label}>{label}</Text>
      </View>
      <View style={[inp.wrap, focused && inp.wrapFocused, !!error && inp.wrapError]}>
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
  group:    { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 2 },
  labelTick:{ width: 2, height: 10, backgroundColor: C.accent, borderRadius: 1, marginRight: 7, opacity: 0.85 },
  label: {
    fontSize: 10, fontWeight: '700', color: C.accent,
    letterSpacing: 2, textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.panel, borderWidth: 1,
    borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 14, height: 52, overflow: 'hidden',
  },
  bracket: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.accentDim,
    borderTopLeftRadius: 8, borderBottomLeftRadius: 8,
  },
  wrapFocused: { borderColor: C.accent, backgroundColor: 'rgba(0,168,255,0.08)' },
  wrapError:   { borderColor: C.error,  backgroundColor: 'rgba(255,64,96,0.06)' },
  iconWrap:    { marginRight: 10, marginLeft: 4 },
  input: {
    flex: 1, color: C.text, fontSize: 15, height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  errorRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 2 },
  errorText: { color: C.error, fontSize: 12, fontWeight: '500' },
});

/* ─────────────────────────────────────────
   Form Errors
───────────────────────────────────────── */
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/* ─────────────────────────────────────────
   Register Screen
───────────────────────────────────────── */
export default function Register() {
  const router = useRouter();
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [errors,          setErrors]          = useState<FormErrors>({});
  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [successMessage,  setSuccessMessage]  = useState('');
  const [showTermsModal,  setShowTermsModal]  = useState(false);

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
    if (!agreedToTerms) { setShowTermsModal(true); return false; }
    return true;
  };

  const handleRegister = async () => {
    setSuccessMessage('');
    if (!validateForm()) return;
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/register`, { name, email, password }, { timeout: 10000 });
      if (res.data.success) {
        const { token, user } = res.data;
        try {
          await setItem('authToken', token);
          await setItem('user', JSON.stringify(user));
          await registerFirebasePushToken(API_URL, token).catch(() => null);
        } catch (err) { console.error('Error storing token/user:', err); }
        setSuccessMessage('UNIT REGISTERED SUCCESSFULLY');
        setTimeout(() => router.replace('/(user)/UserProfile'), 1500);
      }
    } catch (err: any) {
      const message    = err?.response?.data?.message || err?.message || 'Registration failed';
      const statusCode = err?.response?.status;
      const isEmailTaken =
        statusCode === 409 ||
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('exists') ||
        message.toLowerCase().includes('registered') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('in use');
      if (isEmailTaken) {
        setErrors((prev) => ({ ...prev, email: 'This email is already registered. Try signing in instead.' }));
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    if (!CAN_USE_GOOGLE_AUTH) return;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const handleGoogleRegister = async () => {
    if (IS_EXPO_GO) { Alert.alert('Google Sign-in', 'Requires a dev build.'); return; }
    if (!GOOGLE_AUTH_ENABLED) { Alert.alert('Google Sign-in', 'Disabled in current env.'); return; }
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
      if (!idToken) { Alert.alert('Google Sign-in Failed', 'Missing id token.'); return; }
      const credential      = GoogleAuthProvider.credential(idToken);
      const userCred        = await signInWithCredential(auth, credential);
      const firebaseIdToken = await userCred.user.getIdToken();
      const res = await axios.post(
        `${API_URL}/login`,
        { provider: 'google', idToken: firebaseIdToken, googleIdToken: idToken },
        { timeout: 10000 }
      );
      if (res.data.success) {
        const { token, user } = res.data;
        await setItem('authToken', token);
        await setItem('user', JSON.stringify(user));
        await registerFirebasePushToken(API_URL, token).catch(() => null);
        setSuccessMessage('UNIT REGISTERED SUCCESSFULLY');
        setTimeout(() => router.replace('/(user)/UserProfile'), 1200);
      }
    } catch (e: any) {
      Alert.alert('Google Registration Failed', mapGoogleSignInErrorMessage(e));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      {/* ══════════════════════════════════
          TERMS MODAL
      ══════════════════════════════════ */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowTermsModal(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            {/* Corner accents */}
            <View style={s.modalCornerTL} />
            <View style={s.modalCornerTR} />
            <View style={s.modalCornerBL} />
            <View style={s.modalCornerBR} />

            {/* Icon */}
            <View style={s.modalIconWrap}>
              <MaterialCommunityIcons name="shield-lock-outline" size={30} color={C.accent} />
              {/* Pulsing dot */}
              <View style={s.modalIconDot} />
            </View>

            {/* Sys tag */}
            <View style={s.modalSysRow}>
              <View style={s.modalSysDash} />
              <Text style={s.modalSysTag}>AUTHORIZATION REQUIRED</Text>
              <View style={s.modalSysDash} />
            </View>

            <Text style={s.modalTitle}>Terms Required</Text>
            <Text style={s.modalSubtitle}>
              You must accept our Terms & Conditions and Privacy Policy to initialize your unit account.
            </Text>

            <View style={s.modalDivider} />

            {/* Accept */}
            <TouchableOpacity
              style={s.modalAcceptBtn}
              onPress={() => { setAgreedToTerms(true); setShowTermsModal(false); }}
              activeOpacity={0.85}
            >
              <View style={s.modalBtnScanBar} />
              <Feather name="zap" size={15} color={C.bg} style={{ marginRight: 8 }} />
              <Text style={s.modalAcceptText}>ACCEPT & INITIALIZE</Text>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity style={s.modalDismissBtn} onPress={() => setShowTermsModal(false)} activeOpacity={0.7}>
              <Text style={s.modalDismissText}>[ CANCEL ]</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════
            BRAND
        ══════════════════════════════════ */}
        <View style={s.brandWrap}>
          <View style={s.robotBadge}>
            <RobotHeadIcon size={48} />
            <View style={s.badgeStatusDot} />
          </View>

          <View style={s.sysTagRow}>
            <View style={s.sysDash} />
            <Text style={s.sysTag}>UNIT-7 MOBILITY OS v2.4</Text>
            <View style={s.sysDash} />
          </View>

          <Text style={s.brandTitle}>ROMERO'S KINGDOM</Text>
          <Text style={s.brandSub}>AUTONOMOUS COMMERCE UNIT — ENROLL</Text>
        </View>

        {/* ══════════════════════════════════
            CARD
        ══════════════════════════════════ */}
        <View style={s.card}>
          {/* Mechanical corner accents */}
          <View style={s.cardTL} />
          <View style={s.cardTR} />
          <View style={s.cardBL} />
          <View style={s.cardBR} />

          {/* Success banner */}
          {!!successMessage && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={s.successText}>  {successMessage}</Text>
            </View>
          )}

          <Text style={s.cardTitle}>ENROLL UNIT</Text>
          <Text style={s.cardSub}>CREATE YOUR OPERATOR PROFILE</Text>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <View style={s.dividerDot} />
            <View style={s.dividerLine} />
          </View>

          {/* Full Name */}
          <InputField
            label="Operator Name"
            placeholder="Full name"
            value={name}
            onChangeText={(t) => { setName(t); setErrors({ ...errors, name: undefined }); }}
            autoCapitalize="words"
            editable={!loading}
            error={errors.name}
            leftIcon={<Feather name="user" size={16} color={C.accent} />}
          />

          {/* Email */}
          <InputField
            label="User ID — Email"
            placeholder="operator@system.io"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: undefined }); }}
            keyboardType="email-address"
            editable={!loading}
            error={errors.email}
            leftIcon={<Feather name="cpu" size={16} color={C.accent} />}
          />

          {/* Password */}
          <InputField
            label="Auth Key — Password"
            placeholder="Create a passkey"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: undefined }); }}
            secureTextEntry={!showPassword}
            editable={!loading}
            error={errors.password}
            leftIcon={<Feather name="shield" size={16} color={C.accent} />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color={C.textSub} />
              </TouchableOpacity>
            }
          />

          {/* Confirm Password */}
          <InputField
            label="Confirm Auth Key"
            placeholder="Re-enter passkey"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setErrors({ ...errors, confirmPassword: undefined }); }}
            secureTextEntry={!showConfirmPw}
            editable={!loading}
            error={errors.confirmPassword}
            leftIcon={<Feather name="lock" size={16} color={C.accent} />}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowConfirmPw(!showConfirmPw)}
                disabled={loading}
                style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name={showConfirmPw ? 'eye' : 'eye-off'} size={16} color={C.textSub} />
              </TouchableOpacity>
            }
          />

          {/* Terms checkbox */}
          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
              {agreedToTerms && <Feather name="check" size={11} color={C.bg} />}
            </View>
            <Text style={s.termsText}>
              I authorize the{' '}
              <Text style={s.termsLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={s.termsLink}>Privacy Protocol</Text>
            </Text>
          </TouchableOpacity>

          {/* Register button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.registerBtn, loading && s.disabledBtn]}
              onPress={handleRegister}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
              activeOpacity={1}
            >
              <View style={s.btnScanBar} />
              {loading ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <>
                  <Feather name="zap" size={15} color={C.bg} style={{ marginRight: 8 }} />
                  <Text style={s.registerBtnText}>INITIALIZE ACCOUNT</Text>
                  <Feather name="arrow-right" size={15} color={C.bg} style={{ marginLeft: 8 }} />
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
          <TouchableOpacity style={s.socialBtn} disabled={loading} activeOpacity={0.8} onPress={handleGoogleRegister}>
            <View style={s.socialLeftBar} />
            <View style={s.socialLogoWrap}><GoogleLogo /></View>
            <Text style={s.socialText}>SYNC VIA GOOGLE NETWORK</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>ALREADY ENROLLED?  </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={loading}>
            <Text style={s.loginLink}>[ SIGN IN ]</Text>
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

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1, paddingHorizontal: 22,
    paddingVertical: 48, justifyContent: 'center',
  },

  /* Brand */
  brandWrap:      { alignItems: 'center', marginBottom: 26 },
  robotBadge: {
    width: 82, height: 82,
    backgroundColor: C.surface,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5, borderColor: C.borderBright,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  badgeStatusDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
  sysTagRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sysDash:      { width: 20, height: 1, backgroundColor: C.accent, opacity: 0.4, marginHorizontal: 8 },
  sysTag: {
    fontSize: 8, color: C.accent, letterSpacing: 1.8, opacity: 0.75,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  brandTitle: {
    fontSize: 18, fontWeight: '800', color: C.text,
    letterSpacing: 3.5, marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  brandSub: {
    fontSize: 9, color: C.textSub, letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Card */
  card: {
    backgroundColor: 'rgba(4,15,31,0.95)',
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 26,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 30, elevation: 14,
  },
  /* Mechanical corner accents */
  cardTL: { position: 'absolute', top: -1, left: -1,   width: 16, height: 16, borderTopWidth: 2,    borderLeftWidth: 2,  borderColor: C.accent, borderTopLeftRadius: 16 },
  cardTR: { position: 'absolute', top: -1, right: -1,  width: 16, height: 16, borderTopWidth: 2,    borderRightWidth: 2, borderColor: C.accent, borderTopRightRadius: 16 },
  cardBL: { position: 'absolute', bottom: -1, left: -1,  width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: C.accent, borderBottomLeftRadius: 16 },
  cardBR: { position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderColor: C.accent, borderBottomRightRadius: 16 },

  cardTitle: {
    fontSize: 18, fontWeight: '800', color: C.text,
    marginBottom: 3, letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardSub: {
    fontSize: 9, color: C.textSub, marginBottom: 18, letterSpacing: 1.4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  divider:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginHorizontal: 8, opacity: 0.8 },

  /* Success */
  successBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,212,170,0.4)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 18,
  },
  successText: {
    color: C.success, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  eyeBtn: { padding: 4, marginLeft: 6 },

  /* Terms */
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 22, marginTop: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.panel,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  termsText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 20 },
  termsLink: { color: C.accentText, fontWeight: '700' },

  /* Register button */
  registerBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 16, elevation: 10,
    overflow: 'hidden',
  },
  btnScanBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  disabledBtn: { opacity: 0.5 },
  registerBtnText: {
    color: C.bg, fontSize: 13, fontWeight: '800', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* OR */
  orDivider:   { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine:      { flex: 1, height: 1, backgroundColor: C.border },
  orText: {
    color: C.textDim, fontSize: 9, marginHorizontal: 10, letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Social */
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingVertical: 13, overflow: 'hidden',
  },
  socialLeftBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.accentDim,
  },
  socialLogoWrap: { marginRight: 10 },
  socialText: {
    color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Footer */
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  footerText: {
    color: C.textDim, fontSize: 10, letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  loginLink: {
    color: C.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Admin pill */
  adminPill: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,168,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,168,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginTop: 16,
  },
  adminPillText: {
    color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  /* Terms Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 28, alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 30, elevation: 20,
  },
  /* Modal corner accents */
  modalCornerTL: { position: 'absolute', top: -1, left: -1,   width: 14, height: 14, borderTopWidth: 2,    borderLeftWidth: 2,  borderColor: C.accent, borderTopLeftRadius: 18 },
  modalCornerTR: { position: 'absolute', top: -1, right: -1,  width: 14, height: 14, borderTopWidth: 2,    borderRightWidth: 2, borderColor: C.accent, borderTopRightRadius: 18 },
  modalCornerBL: { position: 'absolute', bottom: -1, left: -1,  width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: C.accent, borderBottomLeftRadius: 18 },
  modalCornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderColor: C.accent, borderBottomRightRadius: 18 },

  modalIconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.accentGlow,
    borderWidth: 1, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalIconDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 5, elevation: 3,
  },
  modalSysRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalSysDash: { width: 16, height: 1, backgroundColor: C.accent, opacity: 0.4, marginHorizontal: 6 },
  modalSysTag: {
    fontSize: 8, color: C.accent, letterSpacing: 1.8, opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalTitle: {
    fontSize: 18, fontWeight: '800', color: C.text,
    letterSpacing: 1.5, marginBottom: 10, textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalSubtitle: {
    fontSize: 12, color: C.textSub,
    textAlign: 'center', lineHeight: 20,
    marginBottom: 22, paddingHorizontal: 4,
  },
  modalDivider: {
    width: '100%', height: 1,
    backgroundColor: C.border, marginBottom: 20,
  },
  modalAcceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, borderRadius: 10,
    paddingVertical: 14, width: '100%', marginBottom: 12,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 14, elevation: 8,
    overflow: 'hidden',
  },
  modalBtnScanBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  modalAcceptText: {
    color: C.bg, fontSize: 13, fontWeight: '800', letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalDismissBtn: { paddingVertical: 8 },
  modalDismissText: {
    color: C.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

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

  return error?.response?.data?.message || error?.message || 'Failed';
}