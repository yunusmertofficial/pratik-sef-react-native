import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { MEAL_TYPES } from "@/types/recipe";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/api";

export default function RecipeDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuthStore();

  const api = process.env.EXPO_PUBLIC_API_URL || "";
  const [apiError, setApiError] = useState<string | null>(null);

  const [loadingAlt, setLoadingAlt] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const [data, setData] = useState<any>(null);
  const [imgLoading, setImgLoading] = useState(true);
  // Resim yüklenmezse fallback (yedek) resim göstermek için state
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5; // Pollinations.ai yavaş, daha fazla retry

  const id = typeof params.id === "string" ? params.id : "";
  const payloadRaw = typeof params.payload === "string" ? params.payload : "";

  // _id varsa veritabanında kayıtlıdır
  const isSaved = !!data?._id;

  // 1. VERİYİ GÜVENLİ ÇÖZME (Parsing)
  useEffect(() => {
    if (payloadRaw) {
      try {
        // Önce decode etmeyi dene
        const decoded = decodeURIComponent(payloadRaw);
        setData(JSON.parse(decoded));
      } catch (e) {
        // Hata verirse belki zaten decode edilmiştir, direkt parse dene
        try {
          setData(JSON.parse(payloadRaw));
        } catch (err) {
          console.error("Veri çözme hatası:", err);
          setApiError("Tarif verisi okunamadı.");
        }
      }
    } else if (id && token && api) {
      // Eğer payload yoksa ID'den çek (Tariflerim sayfasından gelince)
      apiFetch(`${api}/api/recipe/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.error) setData(j);
        })
        .catch(() => {});
    }
  }, [id, token, api, payloadRaw]);

  // Resim URL'i değişince loading'i resetle
  useEffect(() => {
    if (data?.imageUrl) {
      setImgLoading(true);
      setImgError(false);
    }
  }, [data?.imageUrl]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["left", "right"]}
    >
      <Stack.Screen
        options={{ title: data?.title || "Tarif", headerBackTitle: "Geri" }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {apiError && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>⚠️ {apiError}</Text>
          </View>
        )}

        {/* RESİM ALANI */}
        {data?.imageUrl && (
          <View style={styles.imageWrap}>
            {imgLoading && (
              <View
                style={[
                  styles.imagePlaceholder,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <ActivityIndicator color={theme.primary} />
              </View>
            )}
            <Image
              key={`${data.imageUrl}-${retryCount}`} // Retry için key değiştir
              // Eğer hata varsa veya URL bozuksa varsayılan resim göster
              source={
                imgError
                  ? {
                      uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                    }
                  : { uri: data.imageUrl }
              }
              style={[styles.image, { opacity: imgLoading ? 0 : 1 }]}
              // DÜZELTME: Cache Policy'i her zaman 'disk' yapıyoruz.
              cachePolicy="disk"
              contentFit="cover"
              transition={250}
              onLoadStart={() => {
                setImgLoading(true);
                setImgError(false);
              }}
              onLoad={() => {
                console.log("✅ [RecipeDetail] Resim başarıyla yüklendi");
                setImgLoading(false);
                setImgError(false);
                setRetryCount(0); // Başarılı olunca retry sayacını sıfırla
              }}
              onError={(e: any) => {
                const errorStr = JSON.stringify(e);
                const isTimeout =
                  errorStr.includes("timeout") || errorStr.includes("Timeout");

                console.log("⚠️ [RecipeDetail] Resim Yükleme Hatası:", {
                  isTimeout,
                  retryCount,
                  maxRetries: MAX_RETRIES,
                });

                // Timeout hatası ve retry hakkı varsa tekrar dene
                if (isTimeout && retryCount < MAX_RETRIES) {
                  const newRetryCount = retryCount + 1;
                  console.log(
                    `🔄 [RecipeDetail] Timeout hatası, ${newRetryCount}/${MAX_RETRIES} tekrar deneniyor...`
                  );
                  setRetryCount(newRetryCount);

                  // 3 saniye bekle ve resmi tekrar yükle (key değiştirerek)
                  setTimeout(() => {
                    setImgLoading(true);
                    setImgError(false);
                  }, 3000);
                } else {
                  // Maksimum retry'den sonra hata göster
                  if (retryCount >= MAX_RETRIES) {
                    console.warn(
                      "⚠️ [RecipeDetail] Maksimum retry sayısına ulaşıldı"
                    );
                    setImgLoading(false);
                    setImgError(true);
                  } else {
                    // Timeout değilse direkt hata göster
                    setImgLoading(false);
                    setImgError(true);
                  }
                }
              }}
            />
          </View>
        )}

        {/* BUTONLAR */}
        <View style={styles.actionsTop}>
          <TouchableOpacity
            disabled={loadingSave || !token || !api || !data}
            onPress={async () => {
              if (!token || !api || !data) return;
              setApiError(null);
              setLoadingSave(true);
              try {
                if (isSaved) {
                  const res = await apiFetch(`${api}/api/recipe/${data._id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const j = await res.json();
                  if (!res.ok) throw new Error(j?.error || "Silme hatası");
                  router.back();
                } else {
                  // Kaydederken ID'yi siliyoruz ki çakışma olmasın (MongoDB kendi ID verir)
                  const { _id, id, ...recipeData } = data;
                  const res = await apiFetch(`${api}/api/save-recipe`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(recipeData),
                  });
                  const j = await res.json();
                  if (!res.ok)
                    throw new Error(j?.error || j?.message || "Kayıt hatası");
                  // Kayıt başarılıysa dönen ID'yi state'e işle
                  if (j?.ok && j?.recipeId)
                    setData((prev: any) => ({ ...prev, _id: j.recipeId }));
                }
              } catch (e: any) {
                setApiError(
                  e?.message ||
                    (isSaved
                      ? "Silme başarısız oldu."
                      : "Kayıt başarısız oldu.")
                );
              } finally {
                setLoadingSave(false);
              }
            }}
            style={[styles.secondaryBtn, { backgroundColor: theme.secondary }]}
          >
            {loadingSave ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons
                name={isSaved ? "trash" : "bookmark"}
                size={18}
                color="#fff"
              />
            )}
            <Text style={styles.secondaryBtnText}>
              {isSaved ? "Sil" : "Kaydet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loadingAlt || !token || !api || !data}
            onPress={async () => {
              if (!token || !api || !data) return;
              setApiError(null);
              setLoadingAlt(true);
              try {
                const ingredientsStr = Array.isArray(data.ingredients)
                  ? data.ingredients.join(", ")
                  : data.ingredients;
                const meal = MEAL_TYPES.find((m) => m.title === data.mealType);
                const mealTypeId = meal ? meal.id : MEAL_TYPES[0].id;

                const res = await apiFetch(`${api}/api/generate-recipe`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    ingredients: ingredientsStr,
                    mealTypeId,
                    isAlternative: true,
                  }),
                });

                const j = await res.json();
                if (!res.ok)
                  throw new Error(
                    j?.error || j?.message || "Tarif üretilemedi."
                  );

                // Yeni tarife git
                const payload = encodeURIComponent(JSON.stringify(j));
                // replace kullanıyoruz ki geri gelince eski tarife dönmesin (tercihe bağlı push da olabilir)
                router.push(`/recipe/${j.id}?payload=${payload}` as any);
              } catch (e: any) {
                setApiError(e?.message || "İstek başarısız oldu.");
              } finally {
                setLoadingAlt(false);
              }
            }}
            style={[styles.secondaryBtn, { backgroundColor: theme.accent }]}
          >
            {loadingAlt ? (
              <ActivityIndicator color="#2C3E50" />
            ) : (
              <Ionicons name="refresh" size={18} color="#2C3E50" />
            )}
            <Text style={[styles.secondaryBtnText, { color: "#2C3E50" }]}>
              Alternatif
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {data?.title || ""}
        </Text>
        <Text style={[styles.text, { color: theme.textLight }]}>
          {data?.description || ""}
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>Malzemeler</Text>
        {(data?.ingredients || []).map((i: string, idx: number) => (
          <Text key={idx} style={[styles.text, { color: theme.textLight }]}>
            • {i}
          </Text>
        ))}

        <Text style={[styles.section, { color: theme.text }]}>Adımlar</Text>
        {(data?.steps || []).map((s: string, idx: number) => (
          <Text key={idx} style={[styles.text, { color: theme.textLight }]}>
            {idx + 1}. {s}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  banner: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(231, 76, 60, 0.9)",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#c0392b",
  },
  bannerText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  imageWrap: {
    width: "100%",
    height: 250,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  }, // Gri arka plan ekledim
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  section: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  actionsTop: { flexDirection: "row", marginTop: 6, marginBottom: 20 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  secondaryBtnText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
});
