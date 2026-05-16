import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MOCK_EVENTS = [
  { id: '1', title: 'Weekend Jogging Club', date: 'Saturday, 9:00 AM', location: 'Central Park', attendees: 12, image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=500&q=80' },
  { id: '2', title: 'Board Game Night', date: 'Tuesday, 7:00 PM', location: 'Geeky Cafe', attendees: 8, image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?w=500&q=80' },
  { id: '3', title: 'Indie Rock Live Show', date: 'Friday, 8:00 PM', location: 'The Basement', attendees: 45, image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
];

const EventsScreen = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.eventCard}>
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.imageOverlay}
      >
        <Text style={styles.eventTitle}>{item.title}</Text>
      </LinearGradient>
      
      <View style={styles.eventDetailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.eventDetails}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.eventDetails}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={styles.eventDetails}>{item.attendees} going</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover Gatherings</Text>
      <Text style={styles.subheader}>Hand-picked for your interests</Text>
      <FlatList
        data={MOCK_EVENTS}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E8ECEF',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'flex-end',
    padding: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventDetailsContainer: {
    padding: 16,
    backgroundColor: colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetails: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default EventsScreen;
