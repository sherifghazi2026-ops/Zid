import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export const useAnimatedPress = (scaleTo = 0.96) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      tension: 200,
      friction: 3,
    }).start();
  }, [scale, scaleTo]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 3,
    }).start();
  }, [scale]);

  return { scale, pressIn, pressOut };
};
