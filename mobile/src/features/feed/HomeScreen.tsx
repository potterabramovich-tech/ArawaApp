import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { ArawaMark } from '@/components/ArawaMark';
import { GlowButton } from '@/components/GlowButton';
import { colors, radii, spacing } from '@/theme/tokens';
import { router } from 'expo-router';

export function HomeScreen(){return <Screen><View style={styles.header}><ArawaMark compact/><View style={styles.headerActions}><Ionicons name="search-outline" size={23} color={colors.text}/><View style={styles.dot}/><Ionicons name="notifications-outline" size={23} color={colors.text}/></View></View><Animated.View entering={FadeInDown} style={styles.hero}><Text style={styles.eyebrow}>GOOD TO SEE YOU</Text><Text style={styles.title}>Your feed starts with what inspires you.</Text><Text style={styles.body}>Follow creators and publish your first moment to shape this space.</Text></Animated.View><Animated.View entering={FadeInDown.delay(120)} style={styles.card}><View style={styles.icon}><Ionicons name="sparkles" size={25} color={colors.cyan}/></View><Text style={styles.cardTitle}>Nothing here yet</Text><Text style={styles.cardBody}>Arawa never fills your feed with placeholder posts. Your world will appear here as it grows.</Text><GlowButton label="Create your first moment" onPress={()=>router.push('/(tabs)/camera')}/></Animated.View></Screen>}
const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerActions:{flexDirection:'row',gap:18,alignItems:'center'},dot:{width:3,height:3,borderRadius:2,backgroundColor:colors.line},hero:{marginTop:spacing.xxl,gap:12},eyebrow:{color:colors.cyan,fontSize:11,fontWeight:'800',letterSpacing:2},title:{color:colors.text,fontSize:34,lineHeight:40,fontWeight:'800',letterSpacing:-1},body:{color:colors.textMuted,fontSize:16,lineHeight:24},card:{marginTop:spacing.xl,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},icon:{width:52,height:52,borderRadius:18,backgroundColor:'rgba(56,217,230,.09)',alignItems:'center',justifyContent:'center'},cardTitle:{color:colors.text,fontSize:22,fontWeight:'800'},cardBody:{color:colors.textMuted,lineHeight:22,marginBottom:6}});

