import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Mode = 'market' | 'fundraising' | null;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const MARKET_QUESTIONS = [
  'What sectors are hot in Indian startup ecosystem right now?',
  'Which VC firms are most active in Series A stage?',
  'What are the latest funding trends in FinTech?',
];

const FUNDRAISING_QUESTIONS = [
  'How do I craft a compelling pitch for angel investors?',
  'What metrics should I highlight in my pitch deck?',
  'How long does a typical fundraising round take?',
];

export default function AskAIScreen() {
  const [mode, setMode] = useState<Mode>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'This is a demo response. Connect Gemini 1.5 API to get real AI-powered insights for your queries.',
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 800);
  };

  const handleQuestion = (q: string) => {
    setInputText(q);
  };

  const suggestions = mode === 'market' ? MARKET_QUESTIONS : mode === 'fundraising' ? FUNDRAISING_QUESTIONS : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Powered by Gemini 1.5 Flash</Text>
        </View>

        {!mode ? (
          <ScrollView contentContainerStyle={styles.modeContent}>
            <Text style={styles.modePrompt}>Choose a mode to get started</Text>
            <TouchableOpacity style={styles.modeCard} onPress={() => setMode('market')}>
              <View style={[styles.modeIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="bar-chart-outline" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.modeCardTitle}>Market Intelligence</Text>
                <Text style={styles.modeCardSub}>Real-time insights on sectors, investors, and deal flow</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeCard} onPress={() => setMode('fundraising')}>
              <View style={[styles.modeIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="rocket-outline" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.modeCardTitle}>Fundraising Coach</Text>
                <Text style={styles.modeCardSub}>Personalized guidance for your fundraising journey</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Mode Pill */}
            <View style={styles.modePillRow}>
              <View style={[
                styles.modePill,
                mode === 'market' ? { backgroundColor: '#EFF6FF' } : { backgroundColor: '#FEF3C7' },
              ]}>
                <Text style={[styles.modePillText, { color: mode === 'market' ? '#2563EB' : '#F59E0B' }]}>
                  {mode === 'market' ? 'Market Intelligence' : 'Fundraising Coach'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setMode(null); setMessages([]); }}>
                <Ionicons name="close-circle-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && (
                <View>
                  <Text style={styles.suggestedLabel}>Suggested questions:</Text>
                  {suggestions.map((q, i) => (
                    <TouchableOpacity key={i} style={styles.suggestionCard} onPress={() => handleQuestion(q)}>
                      <Text style={styles.suggestionText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                  ]}
                >
                  <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={[styles.chatInput, { maxHeight: 120 }]}
                placeholder="Ask a question..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modeContent: { paddingHorizontal: 16, paddingBottom: 32 },
  modePrompt: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeCardTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  modeCardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modePillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  modePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modePillText: { fontSize: 13, fontWeight: '600' },
  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingBottom: 16 },
  suggestedLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: { fontSize: 13, color: '#1A1A2E' },
  bubble: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '80%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextAI: { color: '#1A1A2E' },
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#BFDBFE' },
});
