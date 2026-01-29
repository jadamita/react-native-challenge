// Mock react-native for unit tests
module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios,
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  Switch: 'Switch',
  RefreshControl: 'RefreshControl',
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  Appearance: {
    getColorScheme: () => 'dark',
    setColorScheme: jest.fn(),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  Keyboard: {
    dismiss: jest.fn(),
  },
};
