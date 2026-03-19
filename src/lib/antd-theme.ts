import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontSize: 13,
    controlHeight: 32,
  },
  components: {
    Button: { controlHeight: 32, fontSize: 13 },
    Input: { controlHeight: 32, fontSize: 13 },
    Select: { controlHeight: 32, fontSize: 13 },
    Card: { paddingLG: 16 },
    Message: { fontSize: 13 },
  },
};
