import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { ArawaMark } from '@/components/ArawaMark';
import { OrbBackground } from '@/components/OrbBackground';
import { colors } from '@/theme/tokens';

export default function SplashScreen(){
  useEffect(()=>{const timer=setTimeout(()=>router.replace('/welcome'),2200);return()=>clearTimeout(timer)},[]);
  return <Screen style={styles.screen}><OrbBackground/><Animated.View entering={FadeIn.duration(900)}><ArawaMark/></Animated.View><Animated.View entering={FadeInDown.delay(500)} style={styles.bottom}><Text style={styles.line}>Create beyond the ordinary.</Text><View style={styles.loader}><View style={styles.progress}/></View></Animated.View></Screen>
}
const styles=StyleSheet.create({screen:{alignItems:'center',justifyContent:'center'},bottom:{position:'absolute',bottom:54,alignItems:'center',gap:18},line:{color:colors.textMuted,letterSpacing:1},loader:{height:2,width:120,backgroundColor:colors.line,borderRadius:2},progress:{height:2,width:82,backgroundColor:colors.cyan,borderRadius:2}});

