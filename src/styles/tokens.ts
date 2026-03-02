// TDS(Toss Design System) 디자인 토큰 — 프로젝트 전역 색상·타이포 상수
// 하드코딩 #hex / fontSize 대신 이 파일의 토큰을 사용한다.

// ─── Colors ───────────────────────────────────────────────
// TDS semantic color tokens. 실제 @toss/tds-react-native colors 모듈이
// 런타임에 제공되면 해당 import로 교체한다.

export const colors = {
  // Grey scale
  grey50: '#F9FAFB',
  grey100: '#F4F4F5',
  grey200: '#E5E8EB',
  grey300: '#D1D6DB',
  grey400: '#B0B8C1',
  grey500: '#8B95A1',
  grey600: '#6B7684',
  grey700: '#4E5968',
  grey800: '#333D4B',
  grey900: '#202632',
  grey950: '#191F28',

  // Blue (Primary - Lower Saturation)
  blue50: '#F0F6FF',
  blue100: '#D6E4FF',
  blue500: '#4E8AFF',
  blue600: '#3D73E6',
  blue900: '#2E5BB0',

  // Red (Error / Danger)
  red50: '#FFEEEE',
  red500: '#FF4B4B',
  red600: '#E5503C',
  red700: '#D91A1A',
  red900: '#A51926',

  // Green (Success)
  green50: '#F0FDF4',
  green500: '#00C471',
  green700: '#166534',
  green100: '#BBF7D0',

  // Orange (Warning)
  orange500: '#FF9500',
  orange600: '#FF8800',
  orange700: '#FF6B00',

  // Purple (Accent)
  purple500: '#8B5CF6',

  // Semantic
  white: '#FFFFFF',
  background: '#FFFFFF',
  textPrimary: '#202632',
  textSecondary: '#8B95A1',
  textTertiary: '#B0B8C1',
  textDark: '#333D4B',
  border: '#E5E8EB',
  divider: '#F4F4F5',
  surfaceSecondary: '#F8F9FA',
  surfaceTertiary: '#F2F4F6',
  primaryBlue: '#4E8AFF',
  primaryBlueLight: '#4E8AFF20',
  placeholder: '#B0B8C1',

  // Badge semantic colors (행동 유형 뱃지 / 위험도 전용)
  badgeAmber: '#D97706',
  badgeAmberBg: '#FEF3C7',
  badgeRed: '#DC2626',
  badgeRedBg: '#FEE2E2',
  badgeRedDark: '#991B1B',
  badgeBlue: '#2563EB',
  badgeBlueBg: '#DBEAFE',
  badgePurple: '#7C3AED',
  badgePurpleBg: '#EDE9FE',
  badgeGreen: '#059669',
  badgeGreenBg: '#D1FAE5',
  badgePink: '#BE185D',
  badgePinkBg: '#FCE7F3',
  badgeGrey: '#6B7280',
  badgeGreyBg: '#F3F4F6',
} as const;

// ─── Typography ───────────────────────────────────────────
// TDS Typography 1~7 매핑. fontSize 하드코딩 대신 사용.
// 접근성 동적 스케일은 TDS 런타임이 처리하므로 값 자체는 기본 크기.

export const typography = {
  // Display / Hero
  display: { fontSize: 36, lineHeight: 46 },

  // Typography 1~7 (TDS 공식 스케일)
  t1: { fontSize: 30, lineHeight: 40 },
  t2: { fontSize: 26, lineHeight: 35 },
  t3: { fontSize: 22, lineHeight: 31 },
  t4: { fontSize: 20, lineHeight: 29 },
  t5: { fontSize: 17, lineHeight: 25.5 },
  t6: { fontSize: 15, lineHeight: 22.5 },
  t7: { fontSize: 13, lineHeight: 19.5 },

  // Aliases (용도별)
  heroTitle: { fontSize: 28, lineHeight: 38 },
  pageTitle: { fontSize: 22, lineHeight: 31 },
  sectionTitle: { fontSize: 20, lineHeight: 29 },
  body: { fontSize: 17, lineHeight: 25.5 },
  bodySmall: { fontSize: 15, lineHeight: 22.5 },
  caption: { fontSize: 13, lineHeight: 19.5 },
  badge: { fontSize: 11, lineHeight: 16 },

  // 기존 코드에서 자주 쓰이는 비표준 크기 → 가장 가까운 토큰 매핑
  // 16px → t5(17) 또는 t6(15) 중 컨텍스트에 맞게 선택
  // 14px → t7(13)과 t6(15) 사이 — bodySmall(15) 권장
  // 18px → t4(20)과 t5(17) 사이 — sectionTitle(20) 또는 body(17) 권장
  label: { fontSize: 16, lineHeight: 24 },
  detail: { fontSize: 14, lineHeight: 20 },
  subtitle: { fontSize: 18, lineHeight: 27 },
  emoji: { fontSize: 48, lineHeight: 56 },
} as const;

// ─── Spacing ──────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenHorizontal: 20,
  sectionGap: 24,
  elementGap: 12,
} as const;
