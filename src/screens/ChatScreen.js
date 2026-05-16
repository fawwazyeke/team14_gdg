import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GiftedChat, Bubble } from 'react-native-gifted-chat';
import { colors } from '../theme/colors';
import { sendMessage } from '../services/chatService';

const BOT_USER = {
  _id: 2,
  name: 'Companion',
  avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
};

const ChatScreen = () => {
  const [messages, setMessages] = useState([
    {
      _id: 1,
      text: "Hello! I'm here to listen and help you connect. How are you feeling today?",
      createdAt: new Date(),
      user: BOT_USER,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const onSend = useCallback(async (newMessages = []) => {
    setMessages(prev => GiftedChat.append(prev, newMessages));
    setIsTyping(true);

    try {
      const botMessage = await sendMessage(newMessages[0].text);
      setMessages(prev => GiftedChat.append(prev, [botMessage]));
    } finally {
      setIsTyping(false);
    }
  }, []);

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
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default ChatScreen;
