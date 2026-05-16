import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors } from '../theme/colors';
import DailyMissionCard from '../components/DailyMissionCard';

const MOCK_MISSIONS = [
  { 
    id: '1', 
    title: 'Say hello to someone new', 
    description: 'Send a message to a colleague or a neighbor you haven\'t spoken to in a while.' 
  },
  { 
    id: '2', 
    title: 'Take a 10-minute walk', 
    description: 'Get some fresh air and observe the people and nature around you.' 
  },
  { 
    id: '3', 
    title: 'Find a local event', 
    description: 'Check out the Events tab and find one gathering that sounds interesting to you.' 
  },
];

const MissionsScreen = () => {
  const renderItem = ({ item }) => (
    <DailyMissionCard 
      title={item.title} 
      description={item.description} 
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Missions</Text>
      <Text style={styles.subheader}>Small steps towards connection</Text>
      <FlatList
        data={MOCK_MISSIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 24,
    letterSpacing: -0.5,
  },
  subheader: {
    fontSize: 16,
    color: colors.textLight,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});

export default MissionsScreen;
