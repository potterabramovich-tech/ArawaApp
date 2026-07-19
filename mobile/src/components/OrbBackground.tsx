import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/theme/tokens';

export function OrbBackground() {
  const drift = useSharedValue(0);
  useEffect(() => { drift.value = withRepeat(withTiming(1,{duration:5000,easing:Easing.inOut(Easing.ease)}),-1,true); }, [drift]);
  const style = useAnimatedStyle(() => ({ transform:[{translateY:drift.value*18},{scale:1+drift.value*.08}] }));
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Animated.View style={[styles.one,style]} /><View style={styles.two}/></View>;
}
const styles=StyleSheet.create({one:{position:'absolute',width:280,height:280,borderRadius:140,backgroundColor:colors.violet,opacity:.16,top:-90,right:-100},two:{position:'absolute',width:240,height:240,borderRadius:120,backgroundColor:colors.cyan,opacity:.09,bottom:-100,left:-100}});

