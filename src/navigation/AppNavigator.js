import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import DoChatScreen from '../screens/DoChatScreen';
import DoMissionsScreen from '../screens/DoMissionsScreen';
import DoGatheringsScreen from '../screens/DoGatheringsScreen';
import DoProfileScreen from '../screens/DoProfileScreen';
import DebugScreen from '../screens/DebugScreen';
import { useDoTheme } from '../context/DoThemeContext';

const Tab = createBottomTabNavigator();

const ChatIcon   = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v8c0 1.4-1.1 2.5-2.5 2.5H10l-4 4v-4h-.5C4.1 17 4 15.9 4 14.5v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></Svg>;
const TargetIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5"/><Circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.5"/><Circle cx="12" cy="12" r="1.5" fill={c}/></Svg>;
const PeopleIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="9" cy="9" r="3" stroke={c} strokeWidth="1.5"/><Circle cx="16" cy="10" r="2.4" stroke={c} strokeWidth="1.5"/><Path d="M3 19c0-3 3-5 6-5s6 2 6 5M14.5 19c0-2 2-3.5 4-3.5s2.5 1.5 2.5 3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
const PersonIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.5"/><Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
const DebugIcon  = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Path d="M12 2a4 4 0 014 4v1h2a2 2 0 010 4h-2v1a4 4 0 01-8 0v-1H6a2 2 0 010-4h2V6a4 4 0 014-4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></Svg>;

const TABS = [
  { name: 'Talk',    label: 'Talk',    icon: ChatIcon,   screen: DoChatScreen },
  { name: 'Bridges', label: 'Bridges', icon: TargetIcon, screen: DoMissionsScreen },
  { name: 'Gather',  label: 'Gather',  icon: PeopleIcon, screen: DoGatheringsScreen },
  { name: 'You',     label: 'You',     icon: PersonIcon, screen: DoProfileScreen },
  { name: 'Debug',   label: 'Debug',   icon: DebugIcon,  screen: DebugScreen },
];

function DoTabBar({ state, navigation }) {
  const { P } = useDoTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom + 4, backgroundColor: 'transparent' }]}>
      <View style={[styles.tabBarPill, { backgroundColor: P.surface, borderColor: P.line }]}>
        {state.routes.map((route, index) => {
          const tab = TABS[index];
          const focused = state.index === index;
          const color = focused ? '#fff' : P.inkSoft;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.8}
              style={[styles.tabBtn, focused && styles.tabBtnFocused]}
            >
              {focused ? (
                <LinearGradient
                  colors={[P.grad[0], P.grad[1]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.tabBtnActive}
                >
                  {tab.icon(color, 20)}
                  <Text style={styles.tabLabelActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabBtnInner}>
                  {tab.icon(color, 20)}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={props => <DoTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {TABS.map(tab => (
          <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 14, paddingTop: 8,
  },
  tabBarPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 999, borderWidth: 0.5,
    padding: 6,
    shadowColor: '#2A2420', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center' },
  tabBtnFocused: { flex: 1.6 },
  tabBtnActive: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
    shadowColor: '#E08A5F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  tabBtnInner: { paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  tabLabelActive: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
});
