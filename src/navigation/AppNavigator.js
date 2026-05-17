import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import DoChatScreen from '../screens/DoChatScreen';
import DoMissionsScreen from '../screens/DoMissionsScreen';
import DoGatheringsScreen from '../screens/DoGatheringsScreen';
import DoFriendsScreen from '../screens/DoFriendsScreen';
import DoFriendChatScreen from '../screens/DoFriendChatScreen';
import DoProfileScreen from '../screens/DoProfileScreen';
import DoEventFeedbackScreen from '../screens/DoEventFeedbackScreen';
import { useDoTheme } from '../context/DoThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ChatIcon   = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v8c0 1.4-1.1 2.5-2.5 2.5H10l-4 4v-4h-.5C4.1 17 4 15.9 4 14.5v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></Svg>;
const TargetIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5"/><Circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.5"/><Circle cx="12" cy="12" r="1.5" fill={c}/></Svg>;
const GatherIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><Circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.5"/><Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
const PeopleIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="9" cy="9" r="3" stroke={c} strokeWidth="1.5"/><Circle cx="16" cy="10" r="2.4" stroke={c} strokeWidth="1.5"/><Path d="M3 19c0-3 3-5 6-5s6 2 6 5M14.5 19c0-2 2-3.5 4-3.5s2.5 1.5 2.5 3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
const PersonIcon = (c, s) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.5"/><Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></Svg>;

function TalkStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TalkMain" component={DoChatScreen} />
    </Stack.Navigator>
  );
}

function BridgesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BridgesMain" component={DoMissionsScreen} />
    </Stack.Navigator>
  );
}

function GatherStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GatherMain" component={DoGatheringsScreen} />
      <Stack.Screen name="EventFeedback" component={DoEventFeedbackScreen} />
    </Stack.Navigator>
  );
}

function PeopleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PeopleMain" component={DoFriendsScreen} />
      <Stack.Screen name="FriendChat" component={DoFriendChatScreen} />
    </Stack.Navigator>
  );
}

function YouStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="YouMain" component={DoProfileScreen} />
    </Stack.Navigator>
  );
}

const BOTTOM_TAB_DEFS = [
  { name: 'Do',      labelKey: 'nav_do',      icon: ChatIcon,   Screen: TalkStack },
  { name: 'Relate',  labelKey: 'nav_relate',  icon: PeopleIcon, Screen: PeopleStack },
  { name: 'Mission', labelKey: 'nav_mission', icon: TargetIcon, Screen: BridgesStack },
  { name: 'Find',    labelKey: 'nav_find',    icon: GatherIcon, Screen: GatherStack },
];

const PROFILE_TAB_DEF = { name: 'Soul', labelKey: 'nav_soul', icon: PersonIcon, Screen: YouStack };

const linking = {
  config: {
    screens: {
      Do: {
        path: 'do',
        screens: {
          TalkMain: '',
        },
      },
      Relate: {
        path: 'relate',
        screens: {
          PeopleMain: '',
          FriendChat: 'chat',
        },
      },
      Mission: {
        path: '',
        screens: {
          BridgesMain: '',
        },
      },
      Find: {
        path: 'find',
        screens: {
          GatherMain: '',
        },
      },
      Soul: {
        path: 'soul',
        screens: {
          YouMain: '',
        },
      },
    },
  },
};

function DoTabBar({ state, navigation }) {
  const { P } = useDoTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];
  const PROFILE_TAB = { ...PROFILE_TAB_DEF, label: t(PROFILE_TAB_DEF.labelKey) };
  const BOTTOM_TABS = BOTTOM_TAB_DEFS.map(d => ({ ...d, label: t(d.labelKey) }));
  const profileFocused = activeRoute?.name === PROFILE_TAB.name;

  return (
    <>
      <TouchableOpacity
        onPress={() => navigation.navigate(PROFILE_TAB.name)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Soul"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={[styles.profileFab, {
          top: insets.top + 10,
          backgroundColor: profileFocused ? P.primary : P.surface,
          borderColor: profileFocused ? P.primary : P.line,
        }]}
      >
        {profileFocused ? (
          <LinearGradient
            colors={[P.grad[0], P.grad[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.profileFabGradient}
          >
            {PROFILE_TAB.icon('#fff', 21)}
          </LinearGradient>
        ) : (
          PROFILE_TAB.icon(P.inkSoft, 21)
        )}
      </TouchableOpacity>

      <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom + 4, backgroundColor: 'transparent' }]}>
        <View style={[styles.tabBarPill, { backgroundColor: P.surface, borderColor: P.line }]}>
          {BOTTOM_TABS.map((tab) => {
            const route = state.routes.find((r) => r.name === tab.name);
            const focused = activeRoute?.name === tab.name;
            const color = focused ? '#fff' : P.inkSoft;

            return (
              <TouchableOpacity
                key={route?.key || tab.name}
                onPress={() => navigation.navigate(tab.name)}
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
                    <Text style={[styles.tabLabel, { color: P.inkSoft }]} numberOfLines={1}>{tab.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const ALL_TAB_DEFS = [...BOTTOM_TAB_DEFS, PROFILE_TAB_DEF];

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        initialRouteName="Mission"
        tabBar={props => <DoTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {ALL_TAB_DEFS.map(tab => (
          <Tab.Screen key={tab.name} name={tab.name} component={tab.Screen} />
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
  tabBtnInner: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  profileFab: {
    position: 'absolute', right: 18, zIndex: 60,
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 0.5, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2A2420', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 16, elevation: 10,
  },
  profileFabGradient: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
});
