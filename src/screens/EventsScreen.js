import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { getEvents, EVENT_CATEGORIES } from '../services/eventsService';

const EventCard = ({ item }) => (
  <View style={styles.eventCard}>
    <View style={styles.eventCardTop}>
      <Text style={styles.eventEmoji}>{item.emoji}</Text>
      <View style={styles.eventCardInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDetails}>{item.date} · {item.location}</Text>
      </View>
    </View>
    <Text style={styles.eventDescription}>{item.description}</Text>
  </View>
);

const EventsScreen = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getEvents()
      .then(data => {
        setEvents(data);
      })
      .catch(() => {
        setError('Could not load events. Start the backend and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = activeCategory === 'All'
    ? events
    : events.filter(e => e.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <View style={styles.container}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {EVENT_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <EventCard item={item} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No events found for this category.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterBar: {
    flexGrow: 0,
    paddingVertical: 12,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textLight,
    fontWeight: '500',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  eventCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  eventCardInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  eventDetails: {
    fontSize: 13,
    color: colors.textLight,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 40,
    fontSize: 15,
  },
});

export default EventsScreen;
