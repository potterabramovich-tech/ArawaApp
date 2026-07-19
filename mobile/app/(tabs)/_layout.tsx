import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

const icons={index:['home-outline','home'],camera:['add-circle-outline','add-circle'],profile:['person-outline','person']} as const;
export default function TabsLayout(){return <Tabs screenOptions={({route})=>({headerShown:false,tabBarShowLabel:false,tabBarActiveTintColor:colors.cyan,tabBarInactiveTintColor:colors.textMuted,tabBarStyle:{position:'absolute',height:76,paddingTop:10,backgroundColor:'rgba(10,13,19,0.96)',borderTopColor:colors.line},tabBarIcon:({focused,color})=>{const pair=icons[route.name as keyof typeof icons]??icons.index;return <Ionicons name={pair[focused?1:0]} size={route.name==='camera'?34:24} color={color}/>}})}><Tabs.Screen name="index" options={{title:'Home'}}/><Tabs.Screen name="camera" options={{title:'Camera'}}/><Tabs.Screen name="profile" options={{title:'Profile'}}/></Tabs>}

