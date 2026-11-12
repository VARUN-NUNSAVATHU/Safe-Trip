import { Platform, useWindowDimensions } from 'react-native';

export interface ResponsiveLayoutInfo {
  width: number;
  height: number;
  isWeb: boolean;
  /** True when running in a desktop/tablet web browser (>= 768px wide) */
  isDesktopWeb: boolean;
  /** True when running on wide desktop monitors (>= 1024px wide) */
  isWideDesktop: boolean;
}

export const useResponsiveLayout = (): ResponsiveLayoutInfo => {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 768;
  const isWideDesktop = isWeb && width >= 1024;

  return {
    width,
    height,
    isWeb,
    isDesktopWeb,
    isWideDesktop,
  };
};

