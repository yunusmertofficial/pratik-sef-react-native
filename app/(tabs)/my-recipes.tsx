import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FlatList } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/utils/api";

type RecipeItem = {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  imageUrl?: string;
};

export default function MyRecipesScreen() {
  const { token } = useAuthStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Hangi resimlerin yükleniyor olduğunu takip etmek için
  const [imgLoading, setImgLoading] = useState<Record<string, boolean>>({});
  // Hangi resimlerin hata verdiğini takip etmek için
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const router = useRouter();

  const PAGE_SIZE = 10;
  const itemsRef = useRef<RecipeItem[]>([]);
  useEffect(() => { itemsRef.current = items }, [items]);
  const loadItems = useCallback(async (initial: boolean) => {
    if (!token) { setItems([]); setHasMore(false); return; }
    if (loading) return;
    setLoading(true);
    try {
      const skip = initial ? 0 : itemsRef.current.length;
      console.log(`[MyRecipes] fetch start initial=${initial} skip=${skip} limit=${PAGE_SIZE}`);
      const res = await apiFetch(`${process.env.EXPO_PUBLIC_API_URL}/api/my-recipes?limit=${PAGE_SIZE}&skip=${skip}` , { headers: { Authorization: `Bearer ${token}` } });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/json")) throw new Error("Fetch failed");
      const j = await res.json();
      const newItems: RecipeItem[] = Array.isArray(j) ? j : (j?.items || []);
      const more: boolean = Array.isArray(j) ? false : !!j?.hasMore;
      if (initial) {
        setItems(newItems);
      } else {
        setItems(prev => {
          const seen = new Set(prev.map(i => i._id));
          const merged = [...prev];
          newItems.forEach(i => { if (!seen.has(i._id)) merged.push(i); });
          return merged;
        });
      }
      setHasMore(more);
      console.log(`[MyRecipes] fetch success added=${newItems.length} total=${(initial? newItems.length : itemsRef.current.length + newItems.length)} hasMore=${more}`);
    } catch {
      console.log('[MyRecipes] fetch error');
      if (initial) setItems([]);
      setHasMore(false);
    } finally { setLoading(false); }
  }, [token, loading]);

  useEffect(() => { loadItems(true); }, []);
  useFocusEffect(useCallback(() => { setItems([]); itemsRef.current = []; setHasMore(true); loadItems(true); }, [token]));

  // Önbellekleme (Prefetch) - İsteğe bağlı ama hızlandırır
  useEffect(() => {
    items.forEach((i) => {
      if (i.imageUrl) {
        Image.prefetch(i.imageUrl).catch(() => {});
      }
    });
  }, [items]);

  return (
    <SafeAreaView
      edges={['left','right']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(r) => r._id}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={64} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.textLight }]}>Henüz kayıtlı tarif yok.</Text>
            <Text style={[styles.emptySub, { color: theme.textLight }]}>İlk tarifini üretmek için Sihirbaz’a git!</Text>
          </View>
        )}
        renderItem={({ item: r }) => (
          <TouchableOpacity
            onPress={() => router.push(`/recipe/${r._id}` as any)}
            activeOpacity={0.8}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.imageWrap}>
              {imgLoading[r._id] && (
                <View style={[styles.imagePlaceholder, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <ActivityIndicator color={theme.primary} size="small" />
                </View>
              )}
              <Image
                source={{
                  uri: imgError[r._id]
                    ? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
                    : r.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                }}
                style={[styles.image, { opacity: imgLoading[r._id] ? 0 : 1 }]}
                cachePolicy="disk"
                contentFit="cover"
                transition={200}
                onLoadStart={() => setImgLoading((m) => ({ ...m, [r._id]: true }))}
                onLoad={() => setImgLoading((m) => ({ ...m, [r._id]: false }))}
                onError={() => { setImgLoading((m) => ({ ...m, [r._id]: false })); setImgError((m) => ({ ...m, [r._id]: true })); }}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{r.title}</Text>
              <Text style={[styles.cardText, { color: theme.textLight }]} numberOfLines={2} ellipsizeMode="tail">{r.description}</Text>
              <Text style={[styles.cardDate, { color: theme.textLight }]}>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</Text>
            </View>
            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={async (e) => {
              e.stopPropagation();
              if (!token) return;
              Alert.alert("Tarifi Sil", "Bu tarifi silmek istiyor musunuz?", [
                { text: "İptal", style: "cancel" },
                { text: "Sil", style: "destructive", onPress: async () => {
                  try {
                    await apiFetch(`${process.env.EXPO_PUBLIC_API_URL}/api/recipe/${r._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                    setItems((prev) => prev.filter((x) => x._id !== r._id));
                  } catch {}
                } }
              ])
            }}>
              <Ionicons name="trash" size={16} color={theme.textLight} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (!loading && hasMore) loadItems(false); }}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginVertical: 12 }} color={theme.primary} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 18, marginTop: 12, fontWeight: "600" },
  emptySub: { fontSize: 14, marginTop: 4 },
  card: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  imageWrap: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  cardBody: { flex: 1, paddingRight: 30 }, // Sağ tarafta silme butonu için boşluk
  deleteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    zIndex: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardText: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardDate: { fontSize: 11, opacity: 0.7 },
});
