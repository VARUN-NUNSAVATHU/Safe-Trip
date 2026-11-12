import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { SafeButton } from '../components/SafeButton';
import { authService } from '../services/authService';
import { IMAGES } from '../utils/imageAssets';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSafeRoute } from '../hooks/useSafeRouteState';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { isDesktopWeb } = useResponsiveLayout();
  const { openAuthModal, user } = useSafeRoute();

  useEffect(() => {
    if (user && user.email) {
      navigation.replace('MainTabs');
    }
  }, [user, navigation]);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const isLoggedOut = await AsyncStorage.getItem('@saferoute_logged_out');
        if (isLoggedOut === 'true') return;
        const storedUser = await authService.getStoredUser();
        if (storedUser && storedUser.email && isMounted) {
          navigation.replace('MainTabs');
        }
      } catch {}
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [navigation]);

  if (isDesktopWeb) {
    return (
      <View style={styles.webContainer}>
        {/* Website Top Navigation Bar */}
        <View style={styles.webTopNav}>
          <View style={styles.webNavBrand}>
            <View style={styles.webBrandLogoWrap}>
              <Image
                source={IMAGES.logoShieldTransparent}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.webBrandTitle}>SafeTrip</Text>
              <Text style={styles.webBrandSub}>Smart Family Commute Shield</Text>
            </View>
          </View>

          <View style={styles.webNavActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openAuthModal('login')}
              style={styles.webNavSignInBtn}
            >
              <Text style={styles.webNavSignInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.replace('Onboarding')}
              style={styles.webNavStartBtn}
            >
              <Text style={styles.webNavStartText}>Get Started</Text>
              <View style={styles.webNavArrowCircle}>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Two-Column Website Hero */}
        <ScrollView contentContainerStyle={styles.webHeroScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.webHeroGrid}>
            <View style={styles.webHeroLeft}>
              <View style={styles.pillBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pillText}>SMART FAMILY SAFETY & COMMUTE</Text>
              </View>

              <Text style={styles.webHeroHeadline}>
                Travel Safe. Reach Safe.{'\n'}
                <Text style={{ color: COLORS.brandGreen }}>Zero Missed Check-Ins.</Text>
              </Text>

              <Text style={styles.webHeroSubtitle}>
                SafeTrip detects when you step outside your home perimeter, computes real-time
                transport ETAs, and keeps parents informed automatically from departure to arrival.
              </Text>

              <View style={styles.webHeroBtnRow}>
                <SafeButton
                  title="Get Started"
                  variant="teal"
                  size="lg"
                  onPress={() => navigation.replace('Onboarding')}
                  showArrow
                  style={{ minWidth: 210 }}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openAuthModal('login')}
                  style={styles.webHeroSecondaryBtn}
                >
                  <Ionicons name="log-in-outline" size={18} color={COLORS.textPrimary} />
                  <Text style={styles.webHeroSecondaryText}>Sign In to Account</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.webFeaturesRow}>
                <View style={styles.webFeatureChip}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.brandGreen} />
                  <Text style={styles.webFeatureText}>150m Home Geofence</Text>
                </View>
                <View style={styles.webFeatureChip}>
                  <Ionicons name="speedometer" size={16} color={COLORS.brandGreenDark} />
                  <Text style={styles.webFeatureText}>Mode-Accurate ETA</Text>
                </View>
                <View style={styles.webFeatureChip}>
                  <Ionicons name="people" size={16} color={COLORS.brandGreen} />
                  <Text style={styles.webFeatureText}>Live Family Alerts</Text>
                </View>
              </View>
            </View>

            <View style={styles.webHeroRight}>
              <View style={styles.webShowcaseCard}>
                <View style={styles.webGlowCircle} />
                <Image
                  source={IMAGES.logoSafeTripTransparent}
                  style={styles.webShowcaseLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.responsiveShell}>
        {/* Background radial glow effect centered */}
        <View style={styles.centerBox}>
          <View style={styles.bgGlow} />

          {/* Official SafeTrip Shield & Travel Logo */}
          <View style={styles.logoCardBox}>
            <Image
              source={IMAGES.logoSafeTripTransparent}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.pillBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.pillText}>SMART FAMILY SAFETY & COMMUTE</Text>
          </View>
          <Text style={styles.tagline}>
            Travel Safe • Reach Safe. Automatic departure detection & arrival peace of mind for loved ones.
          </Text>
        </View>

        {/* Bottom CTA for instant navigation or skip */}
        <View style={styles.footer}>
          <SafeButton
            title="Get Started"
            variant="teal"
            size="lg"
            onPress={() => navigation.replace('Onboarding')}
            showArrow
            style={styles.ctaBtn}
          />
          <SafeButton
            title="Sign In to Existing Account"
            variant="ghost"
            size="sm"
            onPress={() => openAuthModal('login')}
            textStyle={{ color: COLORS.brandGreenDark, fontWeight: '700' }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Website Desktop Splash / Hero — Matched to Website Light Mint & Brand Green */
  webContainer: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    width: '100%',
  },
  webTopNav: {
    width: '100%',
    backgroundColor: COLORS.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  webNavBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webBrandLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBrandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  webBrandSub: {
    fontSize: 11,
    color: COLORS.brandGreen,
    fontWeight: '700',
  },
  webNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webNavSignInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  webNavSignInText: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  webNavStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    ...SHADOWS.glowGreen,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  webNavStartText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  webNavArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeroScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  webHeroGrid: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
    flexWrap: 'wrap',
  },
  webHeroLeft: {
    flex: 1.2,
    minWidth: 340,
    alignItems: 'flex-start',
  },
  webHeroHeadline: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 52,
    letterSpacing: -1,
    marginBottom: 16,
  },
  webHeroSubtitle: {
    fontSize: 16.5,
    color: COLORS.textSecondary,
    lineHeight: 26,
    maxWidth: 560,
    marginBottom: 28,
  },
  webHeroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  webHeroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  webHeroSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  webFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  webFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    ...SHADOWS.subtle,
  },
  webFeatureText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  webHeroRight: {
    flex: 1,
    minWidth: 300,
    alignItems: 'center',
  },
  webShowcaseCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.borderGreen,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.float,
  },
  webGlowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.brandGreenSoft,
    top: 20,
  },
  webShowcaseLogo: {
    width: 290,
    height: 240,
    marginBottom: 18,
  },
  webShowcaseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    width: '100%',
    justifyContent: 'center',
  },
  webStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandGreen,
  },
  webShowcaseStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  /* Native Mobile Splash — Matched to Brand Green & Light Mint */
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  responsiveShell: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bgGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    top: 30,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  logoCardBox: {
    width: 250,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ctaBtn: {
    width: '100%',
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
