import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import MissionsScreen from '../screens/MissionsScreen';
import ChatScreen from '../screens/ChatScreen';
import EventsScreen from '../screens/EventsScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Missions') {
              iconName = focused ? 'flag' : 'flag-outline';
            } else if (route.name === 'Chat') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Events') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: { 
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 8,
            shadowColor: colors.shadow,
            shadowOpacity: 0.1,
            shadowOffset: { height: -2 },
            paddingBottom: 5,
            height: 60,
          },
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
        })}
      >
        <Tab.Screen 
          name="Missions" 
          component={MissionsScreen} 
          options={{ title: 'Missions' }}
        />
        <Tab.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ title: 'Companion' }}
        />
        <Tab.Screen 
          name="Events" 
          component={EventsScreen} 
          options={{ title: 'Gatherings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
