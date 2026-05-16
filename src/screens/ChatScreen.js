import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, Platform } from 'react-native';
import { GiftedChat, Bubble, Send } from 'react-native-gifted-chat';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hello! I am here to listen and help you connect. How are you feeling today?',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Companion',
          avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    
    setTimeout(() => {
      setMessages(previousMessages => GiftedChat.append(previousMessages, [{
        _id: Math.round(Math.random() * 1000000),
        text: "I hear you. Remember, small steps make a big difference. How about trying out a daily mission today?",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Companion',
          avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
        },
      }]));
    }, 1000);
  }, []);

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: colors.primary, // Fixed solid color to resolve missing text bug
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 3,
            overflow: 'hidden',
          },
          left: {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 3,
            borderWidth: 1,
            borderColor: colors.border,
          }
        }}
        textStyle={{
          left: { color: colors.text, fontSize: 16 },
          right: { color: '#FFFFFF', fontSize: 16 }
        }}
      />
    );
  };

  const renderSend = (props) => {
    return (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </View>
      </Send>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Your Companion</Text>
            <Text style={styles.headerStatus}>Online • Always here for you</Text>
          </View>
        </View>
      </View>
      
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{ _id: 1 }}
        renderBubble={renderBubble}
        renderSend={renderSend}
        alwaysShowSend
        bottomOffset={Platform.OS === 'ios' ? 80 : 0}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.missionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // Visual balance for send icon
  },
});

export default ChatScreen;
