import { theme as antdTheme, type ThemeConfig } from 'antd';

const sharedTokens: ThemeConfig['token'] = {
  colorPrimary: '#2563eb',
  colorInfo: '#2563eb',
  borderRadius: 12,
  fontSize: 13,
  controlHeight: 36,
};

const lightTokens: ThemeConfig['token'] = {
  ...sharedTokens,
  colorBgBase: '#f8fafc',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorTextBase: '#0f172a',
  colorText: '#0f172a',
  colorTextSecondary: '#475569',
  colorBorder: '#cbd5e1',
};

const darkTokens: ThemeConfig['token'] = {
  ...sharedTokens,
  colorBgBase: '#020617',
  colorBgContainer: '#0f172a',
  colorBgElevated: '#0f172a',
  colorTextBase: '#e2e8f0',
  colorText: '#e2e8f0',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#334155',
};

export const getThemeConfig = (isDark: boolean): ThemeConfig => ({
  algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: isDark ? darkTokens : lightTokens,
  components: {
    Button: {
      controlHeight: 36,
      borderRadius: 10,
      fontSize: 13,
      ...(isDark
        ? { defaultBg: '#0f172a', defaultBorderColor: '#334155', defaultColor: '#e2e8f0' }
        : { defaultBg: '#ffffff', defaultBorderColor: '#cbd5e1', defaultColor: '#0f172a' }),
    },
    Input: { controlHeight: 36, fontSize: 13 },
    Card: { paddingLG: 18 },
    Message: { fontSize: 13 },
    Tabs: {
      ...(isDark
        ? { itemColor: '#94a3b8', itemSelectedColor: '#e2e8f0', itemHoverColor: '#e2e8f0' }
        : { itemColor: '#475569', itemSelectedColor: '#0f172a', itemHoverColor: '#0f172a' }),
    },
    Segmented: {
      ...(isDark
        ? { itemSelectedBg: '#1e293b', trackBg: '#0b1220' }
        : { itemSelectedBg: '#ffffff', trackBg: '#e2e8f0' }),
    },
    Popover: {
      ...(isDark ? { colorBgElevated: '#0f172a' } : { colorBgElevated: '#ffffff' }),
    },
    Select: {
      controlHeight: 36,
      fontSize: 13,
      controlOutline: 'transparent',
      optionSelectedBg: isDark ? '#1e293b' : '#dbeafe',
    },
  },
});
