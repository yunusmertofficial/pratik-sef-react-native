import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/auth'
import { MEAL_TYPES } from '@/types/recipe'
import Colors from '@/constants/Colors'
import { useColorScheme } from '@/components/useColorScheme'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { apiFetch } from '@/utils/api'

export default function WizardScreen() {
  const { token } = useAuthStore()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const router = useRouter()
  const [ingredients, setIngredients] = useState('')
  const [mealTypeId, setMealTypeId] = useState(MEAL_TYPES[0].id)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const api = process.env.EXPO_PUBLIC_API_URL || ''
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!api) setApiError('API URL (EXPO_PUBLIC_API_URL) bulunamadı!')
  }, [api])

  const callGenerate = async (isAlternative = false) => {
    if (!token) return
    if (!(ingredients.trim().length > 0)) { setApiError('Lütfen malzemeleri girin.'); return }
    if (!api) { setApiError('API URL eksik.'); return }
    setApiError(null)
    setGenerating(true)
    try {
      const res = await apiFetch(`${api}/api/generate-recipe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ingredients, mealTypeId, isAlternative })
      })
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) throw new Error('Sunucudan geçersiz yanıt')
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.error || data?.message || (res.status === 429 ? 'Günlük öneri limitine ulaşıldı' : 'Tarif üretilemedi.')
        throw new Error(msg)
      }
      const payload = encodeURIComponent(JSON.stringify(data))
      router.push(`/recipe/${data.id}?payload=${payload}` as any)
    } catch (e: any) {
      setApiError(e?.message || 'İstek başarısız oldu.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <SafeAreaView edges={['left','right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {apiError && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>⚠️ {apiError}</Text>
          </View>
        )}
        {generating && (
          <View style={[styles.overlay, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.overlayText, { color: theme.text }]}>Şefimiz sizin için şu an tarifi hazırlıyor…</Text>
          </View>
        )}
        <Text style={[styles.title, { color: theme.text }]}>Pratik Şef</Text>
        <Text style={[styles.subtitle, { color: theme.textLight }]}>Elinizdeki malzemeleri yazın, size özel tarif önerelim.</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="Örn: tavuk, domates, soğan, sarımsak..."
          placeholderTextColor={theme.textLight}
          value={ingredients}
          multiline
          onChangeText={setIngredients}
        />
        <Text style={[styles.sectionLabel, { color: theme.text }]}>Öğün Türü</Text>
        <View style={styles.chipsRow}>
          {MEAL_TYPES.map(m => (
            <TouchableOpacity key={m.id} onPress={() => setMealTypeId(m.id)}
              style={[styles.chip, mealTypeId===m.id ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.chipText, { color: mealTypeId===m.id ? '#fff' : theme.text }]}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity disabled={loading} onPress={() => callGenerate(false)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Tarif Üret</Text>}
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  banner: { width: '100%', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(231, 76, 60, 0.9)', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#c0392b' },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 20, lineHeight: 24 },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1 },
  chipText: { fontWeight: '600' },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  overlayText: { marginLeft: 10, fontSize: 15, fontWeight: '600' },
  
})