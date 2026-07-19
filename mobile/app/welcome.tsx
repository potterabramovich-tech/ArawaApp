import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { ArawaMark } from '@/components/ArawaMark';
import { GlowButton } from '@/components/GlowButton';
import { OrbBackground } from '@/components/OrbBackground';
import { colors, spacing } from '@/theme/tokens';

export default function Welcome(){ const {width}=useWindowDimensions(); return <Screen style={styles.screen}><OrbBackground/><View style={[styles.content,{maxWidth:Math.min(520,width-48)}]}><Animated.View entering={FadeInDown.duration(600)}><ArawaMark/></Animated.View><Animated.View entering={FadeInDown.delay(140)} style={styles.copy}><Text style={styles.eyebrow}>THE CREATIVE FRONTIER</Text><Text style={styles.title}>Your world.{`\n`}Reimagined.</Text><Text style={styles.body}>Capture ideas, find your people, and shape what comes next.</Text></Animated.View><Animated.View entering={FadeInDown.delay(280)} style={styles.actions}><GlowButton label="Create an account" onPress={()=>router.push('/(auth)/signup')}/><GlowButton label="I already have an account" variant="secondary" onPress={()=>router.push('/(auth)/login')}/></Animated.View></View></Screen> }
const styles=StyleSheet.create({screen:{justifyContent:'center'},content:{width:'100%',alignSelf:'center',gap:spacing.xxl},copy:{gap:spacing.md},eyebrow:{color:colors.cyan,fontSize:12,fontWeight:'800',letterSpacing:2.4},title:{color:colors.text,fontSize:54,lineHeight:58,fontWeight:'800',letterSpacing:-2},body:{color:colors.textMuted,fontSize:18,lineHeight:28,maxWidth:390},actions:{gap:12}});

