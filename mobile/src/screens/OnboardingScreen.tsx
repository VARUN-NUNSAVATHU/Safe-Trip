import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { SafeButton } from '../components/SafeButton';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { IMAGES } from '../utils/imageAssets';
import { useSafeRoute } from '../hooks/useSafeRouteState';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const ONBOARDING_SLIDES = [
  {
    id: 1,
    icon: 'notifications-active' as const,
    ionIcon: 'notifications-outline' as const,
    title: 'Never Forget to Inform Family',
    subtitle:
      'Leaving home in a rush? SafeTrip detects when you leave your home zone and reminds you before your parents start worrying.',
    highlight: 'Auto-detection upon exit',
  },
  {
    id: 2,
    icon: 'location-on' as const,
    ionIcon: 'navigate-circle-outline' as const,
    title: 'Smart Home Geofence',
    subtitle:
      'Set your private home perimeter (150m-500m). When you step outside, an alarm-like notification appears for instant one-tap confirmation.',
    highlight: 'Zero manual check-ins needed',
  },
  {
    id: 3,
    icon: 'verified-user' as const,
    ionIcon: 'shield-checkmark-outline' as const,
    title: 'Real-Time Peace of Mind',
    subtitle:
      'Your parents get instant departure alerts and arrival confirmations when you reach college, work, or gym safely.',
    highlight: 'Parents stay at ease',
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { isDesktopWeb } = useResponsiveLayout();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { openAuthModal, user } = useSafeRoute();

  useEffect(() => {
    if (user && user.email) {
      navigation.replace('MainTabs');
    }
  }, [user, navigation]);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('MainTabs');
      openAuthModal('register');
    }
  };

  const handleSkip = () => {
    navigation.replace('MainTabs');
    openAuthModal('register');
  };

  const currentSlide = ONBOARDING_SLIDES[currentIndex];

  if (isDesktopWeb) {
    return (
      <View style={styles.webOuter}>
        {/* Website Top Nav */}
        <View style={styles.webNav}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.replace('Splash')}
            style={styles.webBrandRow}
          >
            <Image
              source={IMAGES.logoShieldTransparent}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
            <Text style={styles.webBrandText}>SafeTrip</Text>
          </TouchableOpacity>
          <View style={styles.webNavRight}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => openAuthModal('login')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSkip} style={styles.webSkipPill}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Centered Desktop Tour Card */}
        <View style={styles.webCenterBody}>
          <View style={styles.webCard}>
            <View style={styles.webStepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  Step {currentIndex + 1} of {ONBOARDING_SLIDES.length}
                </Text>
              </View>
              <View style={styles.dotsRowCompact}>
                {ONBOARDING_SLIDES.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      currentIndex === idx ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.contentWrap}>
              <View style={styles.illustrationBox}>
                <View style={styles.glowRing}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={currentSlide.ionIcon} size={64} color={COLORS.tealPrimary} />
                  </View>
                </View>
                <View style={styles.highlightPill}>
                  <Ionicons name="sparkles" size={13} color={COLORS.tealPrimary} />
                  <Text style={styles.highlightText}>{currentSlide.highlight}</Text>
                </View>
              </View>

              <Text style={[styles.title, { fontSize: 30 }]}>{currentSlide.title}</Text>
              <Text style={[styles.subtitle, { maxWidth: 480, fontSize: 16, lineHeight: 24 }]}>
                {currentSlide.subtitle}
              </Text>
            </View>

            <View style={[styles.footer, { marginTop: 32 }]}>
              <View style={styles.btnRow}>
                {currentIndex > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCurrentIndex(currentIndex - 1)}
                    style={styles.prevBtn}
                  >
                    <Ionicons name="arrow-back" size={20} color={COLORS.navyPrimary} />
                  </TouchableOpacity>
                )}

                <SafeButton
                  title={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Create Account & Start' : 'Continue'}
                  variant="teal"
                  size="lg"
                  onPress={handleNext}
                  icon={
                    <Ionicons
                      name={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'person-add-outline' : 'arrow-forward'}
                      size={18}
                      color={COLORS.white}
                    />
                  }
                  style={styles.nextBtn}
                />
              </View>

              <View style={styles.signInRow}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => openAuthModal('login')}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Row with Skip */}
      <View style={styles.topBar}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            Step {currentIndex + 1} of {ONBOARDING_SLIDES.length}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Card */}
      <View style={styles.contentWrap}>
        <View style={styles.illustrationBox}>
          <View style={styles.glowRing}>
            <View style={styles.iconCircle}>
              <Ionicons name={currentSlide.ionIcon} size={64} color={COLORS.tealPrimary} />
            </View>
          </View>
          <View style={styles.highlightPill}>
            <Ionicons name="sparkles" size={13} color={COLORS.tealPrimary} />
            <Text style={styles.highlightText}>{currentSlide.highlight}</Text>
          </View>
        </View>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
      </View>

      {/* Bottom Controls with Page Dots and Button */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.btnRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCurrentIndex(currentIndex - 1)}
              style={styles.prevBtn}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.navyPrimary} />
            </TouchableOpacity>
          )}

          <SafeButton
            title={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Create Account & Start' : 'Continue'}
            variant="teal"
            size="lg"
            onPress={handleNext}
            showArrow
            style={styles.nextBtn}
          />
        </View>

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => openAuthModal('login')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    width: '100%',
  },
  webNav: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webBrandText: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  webNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  webSkipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  webCenterBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 36,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    ...SHADOWS.card,
  },
  webStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dotsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  stepBadge: {
    backgroundColor: COLORS.graySubtle,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  skipBtn: {
    padding: SPACING.xs,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  contentWrap: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  illustrationBox: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  glowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.tealMuted,
    ...SHADOWS.glowTeal,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginTop: -16,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
    ...SHADOWS.subtle,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginLeft: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 32,
    backgroundColor: COLORS.tealPrimary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: COLORS.grayBorder,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: SPACING.sm,
  },
  prevBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  nextBtn: {
    flex: 1,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  signInText: {
    fontSize: 14,
    color: COLORS.grayTextSecondary,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
});
