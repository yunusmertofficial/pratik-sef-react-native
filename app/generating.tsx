import { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useAuthStore } from '@/store/auth'
import Colors from '@/constants/Colors'
import { useColorScheme } from '@/components/useColorScheme'

export default function GeneratingScreen() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? 'light']
  const { token } = useAuthStore()
  const router = useRouter()
  const params = useLocalSearchParams()
  const api = process.env.EXPO_PUBLIC_API_URL || ''
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const didStartRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      const ingredients = typeof params.ingredients === 'string' ? params.ingredients : ''
      const mealTypeId = typeof params.mealTypeId === 'string' ? params.mealTypeId : ''
      const alt = typeof params.alt === 'string' ? params.alt === '1' : false
      if (!token || !api || !ingredients || !mealTypeId) {
        setApiError('Eksik parametre veya oturum. Lütfen Pratik Şef’e geri dönün.')
        setLoading(false)
        return
      }
      setLoading(true)
      setApiError(null)
      try {
        const res = await fetch(`${api}/api/generate-recipe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ingredients, mealTypeId, isAlternative: alt })
        })
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) throw new Error('Sunucudan geçersiz yanıt')
        const j = await res.json()
        if (!res.ok) {
          const msg = j?.error || j?.message || (res.status === 429 ? 'Günlük öneri limitine ulaşıldı (3)' : 'Tarif üretilemedi.')
          throw new Error(msg)
        }
        const payload = encodeURIComponent(JSON.stringify(j))
        router.replace(`/recipe/${j.id}?payload=${payload}` as any)
      } catch (e: any) {
        setApiError(e?.message || 'İstek başarısız oldu.')
      } finally { setLoading(false) }
    }
    if (didStartRef.current) return
    didStartRef.current = true
    run()
  }, [params, token, api])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <Stack.Screen options={{ title: 'Pratik Şef' }} />
      <View style={styles.content}>
        {loading && (
          <>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.text, { color: theme.text }]}>Şefimiz sizin için şu an tarifi hazırlıyor…</Text>
          </>
        )}
        {!!apiError && (
          <>
            <Text style={[styles.err, { color: theme.text }]}>{apiError}</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/wizard' as any)} style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.primary }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Geri Dön</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { fontSize: 16, marginTop: 12 },
  err: { fontSize: 14, marginTop: 10 },
})