import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';

export function ArawaMark({ compact = false }: { compact?: boolean }) {
  return <View style={styles.row}>
    <LinearGradient colors={[colors.violet, colors.cyan]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.mark, compact && styles.small]}>
      <View style={styles.core} />
    </LinearGradient>
    {!compact && <Text style={styles.word}>ARAWA</Text>}
  </View>;
}

const styles = StyleSheet.create({ row:{flexDirection:'row',alignItems:'center',gap:12}, mark:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center',transform:[{rotate:'12deg'}]}, small:{width:34,height:34,borderRadius:12}, core:{width:15,height:15,borderRadius:6,backgroundColor:colors.ink}, word:{color:colors.text,fontSize:18,fontWeight:'800',letterSpacing:5} });

