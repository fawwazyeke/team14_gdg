import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { sendMessage } from '../services/chatService';

const BOT_USER = {
  _id: 2,
  name: 'Companion',
  avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
};

const ChatScreen = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: "Hello! I'm here to listen and help you connect. How are you feeling today?",
      createdAt: new Date(),
      user: BOT_USER,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const historyRef = useRef([]);

  const userProfile = {
    interests: profile?.interests || [],
    nickname: profile?.nickname || '',
  };

  const onSend = useCallback(async (newMessages = []) => {
    const userMsg = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));
    setError('');
    setIsTyping(true);

    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: userMsg.text },
    ].slice(-20);

    try {
      const botMessage = await sendMessage(userMsg.text, historyRef.current, userProfile);
      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: botMessage.text },
      ].slice(-20);
      setMessages(prev => GiftedChat.append(prev, [botMessage]));
    } catch (err) {
      setError('Could not reach the AI. Make sure the backend is running.');
    } finally {
      setIsTyping(false);
    }
  }, [profile]);

  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: colors.primary },
        left: { backgroundColor: colors.surface },
      }}
      textStyle={{
        left: { color: colors.text },
        right: { color: '#fff' },
      }}
    />
  );

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GiftedChat
        messages={messages}
        onSend={msgs => onSend(msgs)}
        user={{ _id: 1 }}
        renderBubble={renderBubble}
        isTyping={isTyping}
        alwaysShowSend
        placeholder="Say something..."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  error: {
    backgroundColor: '#b3261e',
    color: '#fff',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default ChatScreen;
