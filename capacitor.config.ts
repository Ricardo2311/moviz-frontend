import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moviz.app',
  appName: 'Moviz',
  webDir: 'build',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#08080f',
    },
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#08080f',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#08080f',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#08080f',
  },
};

export default config;
