import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.amerniksa.app',
  appName: 'أمرني',
  webDir: 'dist',
  android: { allowMixedContent: false },
  ios: { contentInset: 'always' },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: '#1E3A8A', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#1E3A8A' },
  },
}

export default config
