import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { SafeButton } from './SafeButton';
import { LiquidGlassIcon } from './LiquidGlassIcon';
import { COLORS, RADIUS, SPACING } from '../utils/theme';
import { IMAGES } from '../utils/imageAssets';
import { navigationRef } from '../navigation/RootNavigator';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  initialTab = 'login',
}) => {
  const { login, register } = useSafeRoute();

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setErrorMsg('');
    }
  }, [visible, initialTab]);

  if (!visible) return null;

  const navigateToHome = () => {
    try {
      if (navigationRef.isReady()) {
        try {
          (navigationRef as any).reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } catch {
          (navigationRef as any).navigate('MainTabs', { screen: 'HomeTab' });
        }
      }
    } catch (e) {
      console.warn('Navigation to MainTabs error:', e);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password, or use Quick Demo Mode below.');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      const result = tab === 'login'
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password, phone.trim());
      if (result.success) {
        onClose();
        navigateToHome();
      } else {
        setErrorMsg(result.message || 'Authentication check failed. Please verify credentials.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setEmail('demo@safetrip.app');
    setPassword('demo123');
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await login('demo@safetrip.app', 'demo123');
      if (result.success) {
        onClose();
        navigateToHome();
      } else {
        setErrorMsg(result.message || 'Demo login failed.');
      }
    } catch {
      setErrorMsg('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const webCardStyle: any = Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        boxShadow: '0 24px 60px rgba(16, 24, 40, 0.22), 0 4px 16px rgba(66, 184, 63, 0.16)',
      }
    : {};

  const webOverlayStyle: any = Platform.OS === 'web'
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 24, 40, 0.52)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }
    : {};

  const content = (
    <View style={[styles.overlay, webOverlayStyle]}>
      {/* Background backdrop tap closes modal */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        {...(Platform.OS === 'web' ? ({ cursor: 'default' } as any) : {})}
      />

      {/* Floating Modal Box */}
      <View
        style={[styles.card, webCardStyle]}
        {...(Platform.OS === 'web' ? ({ onClick: (e: any) => e.stopPropagation?.() } as any) : {})}
      >
        {/* Top specular reflection rim */}
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.specularRim}
          pointerEvents="none"
        />

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
          {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
        >
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Official SafeTrip Brand Logo Badge */}
          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoGlowUnderlay} />
            <LinearGradient
              colors={['#FFFFFF', '#F0FDF4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGlassBadge}
            >
              {/* Top specular highlight rim */}
              <View style={styles.logoSpecularHighlight} />
              <Image
                source={IMAGES.logoShieldTransparent}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>

          <Text style={styles.title}>SafeTrip</Text>
          <Text style={styles.subtitle}>
            {tab === 'login'
              ? 'Sign in to access your synchronized journeys'
              : 'Create your safe family commute account'}
          </Text>

          {/* Segmented iOS Liquid Glass Tab Switcher */}
          <View style={styles.tabRow}>
            {(['login', 'register'] as const).map((t) => {
              const isActive = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => {
                    setTab(t);
                    setErrorMsg('');
                  }}
                  activeOpacity={0.85}
                  {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#52D14F', '#42B83F', '#2E8B2B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.tabGradient}
                    >
                      <Text style={styles.tabTextActive}>
                        {t === 'login' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.tabText}>
                      {t === 'login' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Error Message Banner */}
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form Fields */}
          {tab === 'register' && (
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={17} color={COLORS.brandGreenDark} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={COLORS.brandGreenDark} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={COLORS.brandGreenDark} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType={tab === 'register' ? 'next' : 'done'}
                onSubmitEditing={tab === 'login' ? handleSubmit : undefined}
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={17}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {tab === 'register' && (
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={17} color={COLORS.brandGreenDark} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
          )}

          {/* Primary Action Button */}
          <SafeButton
            title={tab === 'login' ? 'Sign In' : 'Create Account'}
            variant="teal"
            size="lg"
            onPress={handleSubmit}
            loading={loading}
            showArrow
            style={styles.ctaBtn}
          />

          {/* 1-Tap Quick Demo Pill */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={handleDemo}
            activeOpacity={0.8}
            disabled={loading}
            {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
          >
            <View style={styles.demoDot} />
            <Ionicons name="flash" size={13} color={COLORS.brandGreenDark} />
            <Text style={styles.demoText}>Quick Demo Mode — 1-Tap Access</Text>
          </TouchableOpacity>

          {/* Switch Mode Prompt */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {tab === 'login' ? "Don't have an account? " : 'Already registered? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTab(tab === 'login' ? 'register' : 'login');
                setErrorMsg('');
              }}
              activeOpacity={0.7}
              {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
            >
              <Text style={styles.switchLink}>
                {tab === 'login' ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    zIndex: 99999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(16, 24, 40, 0.48)',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 184, 63, 0.28)',
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 36,
    elevation: 20,
    position: 'relative',
    zIndex: 10,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 2,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 24, 40, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  logoBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  logoGlowUnderlay: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(66, 184, 63, 0.2)',
    ...(Platform.OS === 'web'
      ? ({ filter: 'blur(12px)' } as any)
      : { elevation: 6 }),
  },
  logoGlassBadge: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 184, 63, 0.28)',
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#42B83F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          boxShadow: '0 10px 24px rgba(66, 184, 63, 0.16), 0 2px 6px rgba(16, 24, 40, 0.06)',
        } as any)
      : {}),
  },
  logoSpecularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 2,
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreenSoft,
    borderRadius: RADIUS.full,
    padding: 3,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  tabBtn: {
    flex: 1,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {},
  tabGradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    paddingVertical: 9,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingVertical: 9,
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    width: '100%',
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  field: {
    width: '100%',
    marginBottom: 11,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  ctaBtn: {
    width: '100%',
    marginTop: 6,
    marginBottom: 10,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    marginBottom: 12,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
  },
  demoText: {
    fontSize: 12,
    color: COLORS.brandGreenDark,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontSize: 12.5,
    color: COLORS.brandGreen,
    fontWeight: '800',
  },
});
