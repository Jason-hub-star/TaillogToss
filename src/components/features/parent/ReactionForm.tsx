/**
 * ReactionForm — 보호자 이모지 리액션 + 질문 폼
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

const EMOJI_OPTIONS = [
  { emoji: '\u2764\uFE0F', label: '좋아요' },
  { emoji: '\uD83D\uDE0A', label: '감사해요' },
  { emoji: '\uD83D\uDE22', label: '걱정돼요' },
  { emoji: '\uD83D\uDCAA', label: '화이팅' },
];

interface ReactionFormProps {
  onSubmitReaction: (emoji: string) => void;
  onSubmitQuestion: (question: string) => void;
}

export function ReactionForm({ onSubmitReaction, onSubmitQuestion }: ReactionFormProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);

  const handleEmojiPress = useCallback((emoji: string) => {
    setSelectedEmoji(emoji);
    onSubmitReaction(emoji);
  }, [onSubmitReaction]);

  const handleQuestionSubmit = useCallback(() => {
    if (question.trim()) {
      onSubmitQuestion(question.trim());
      setQuestion('');
      setShowQuestion(false);
    }
  }, [question, onSubmitQuestion]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>리포트가 도움이 되셨나요?</Text>

      <View style={styles.emojiRow}>
        {EMOJI_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.emoji}
            style={[styles.emojiBtn, selectedEmoji === opt.emoji && styles.emojiBtnSelected]}
            onPress={() => handleEmojiPress(opt.emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={styles.emojiLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!showQuestion ? (
        <TouchableOpacity onPress={() => setShowQuestion(true)} activeOpacity={0.7}>
          <Text style={styles.questionLink}>선생님께 질문하기</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.questionForm}>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="질문을 입력해주세요"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !question.trim() && styles.sendBtnDisabled]}
            onPress={handleQuestionSubmit}
            disabled={!question.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>보내기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E8EB' },
  title: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
  emojiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  emojiBtn: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: '#F4F4F5',
  },
  emojiBtnSelected: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#0064FF' },
  emoji: { fontSize: 24 },
  emojiLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  questionLink: { fontSize: 14, color: '#0064FF', fontWeight: '500' },
  questionForm: { gap: 8 },
  questionInput: {
    borderWidth: 1, borderColor: '#E5E8EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 60,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: '#0064FF', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
