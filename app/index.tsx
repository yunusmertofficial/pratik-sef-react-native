import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { apiFetch } from "@/utils/api";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession, token } = useAuthStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const api = process.env.EXPO_PUBLIC_API_URL || "";

  useEffect(() => {
    if (token) router.replace("/(tabs)/wizard");
  }, [token]);

  // Sunucu Sağlık Kontrolü
  useEffect(() => {
    if (!api) {
      setApiError("API URL (EXPO_PUBLIC_API_URL) bulunamadı!");
      return;
    }
    // İsteğe bağlı: Sağlık kontrolünü sessiz yapabiliriz,
    // hata olursa kullanıcı işlem yaparken görür zaten.
    console.log("API URL:", api);
  }, [api]);

  const requestCode = async () => {
    // 1. Validasyon
    if (!email.trim()) {
      setApiError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    if (!api) {
      console.error("❌ API URL bulunamadı!");
      setApiError("API URL (EXPO_PUBLIC_API_URL) bulunamadı!");
      return;
    }

    setLoading(true);
    setApiError(null); // Önceki hataları temizle

    const startTime = Date.now();
    console.log("📡 [REQUEST_CODE] İstek başlatılıyor...");
    console.log("📡 [REQUEST_CODE] URL:", `${api}/api/auth/request-code`);
    console.log("📡 [REQUEST_CODE] Email:", email.trim());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error(
          "⏱️ [REQUEST_CODE] Timeout: İstek 60 saniye içinde tamamlanamadı"
        );
      }, 60000); // 60 saniye timeout (Render.com cold start için)

      const res = await apiFetch(`${api}/api/auth/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.log(`✅ [REQUEST_CODE] Response alındı (${elapsed}ms)`);
      console.log("📡 [REQUEST_CODE] Status:", res.status, res.statusText);
      console.log(
        "📡 [REQUEST_CODE] Headers:",
        Object.fromEntries(res.headers.entries())
      );

      // Yanıtın JSON olup olmadığını kontrol et (HTML dönerse patlamasın)
      const contentType = res.headers.get("content-type");
      console.log("📡 [REQUEST_CODE] Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(
          "❌ [REQUEST_CODE] JSON olmayan yanıt:",
          text.substring(0, 200)
        );
        throw new Error(
          "Sunucudan geçersiz yanıt geldi (HTML hatası olabilir)."
        );
      }

      const data = await res.json();
      console.log(
        "📡 [REQUEST_CODE] Sunucu Yanıtı:",
        JSON.stringify(data, null, 2)
      );

      if (!res.ok) {
        // HTTP hatası (400, 500 vs.) varsa fırlat
        console.error(`❌ [REQUEST_CODE] HTTP ${res.status} hatası:`, data);
        throw new Error(
          data.error || data.message || `Sunucu hatası oluştu (${res.status}).`
        );
      }

      if (data?.ok) {
        // Başarılı
        console.log("✅ [REQUEST_CODE] Başarılı! Kod gönderildi.");
        setStep("verify");
      } else {
        // HTTP 200 ama mantıksal hata
        console.error("❌ [REQUEST_CODE] Mantıksal hata:", data);
        throw new Error(data.error || "Kod gönderilemedi.");
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error(`🔥 [REQUEST_CODE] Hata (${elapsed}ms):`, err);
      console.error("🔥 [REQUEST_CODE] Hata tipi:", err?.name);
      console.error("🔥 [REQUEST_CODE] Hata mesajı:", err?.message);
      console.error("🔥 [REQUEST_CODE] Hata stack:", err?.stack);

      if (err?.name === "AbortError") {
        setApiError("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else if (err?.message?.includes("fetch")) {
        setApiError(
          "Bağlantı hatası: Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin."
        );
      } else {
        setApiError(err.message || "Bağlantı hatası: Sunucuya ulaşılamıyor.");
      }
    } finally {
      const elapsed = Date.now() - startTime;
      console.log(`🏁 [REQUEST_CODE] İşlem tamamlandı (${elapsed}ms)`);
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setApiError("Lütfen gelen kodu girin.");
      return;
    }

    if (!api) {
      console.error("❌ API URL bulunamadı!");
      setApiError("API URL (EXPO_PUBLIC_API_URL) bulunamadı!");
      return;
    }

    setLoading(true);
    setApiError(null);

    const startTime = Date.now();
    console.log("📡 [VERIFY_CODE] İstek başlatılıyor...");
    console.log("📡 [VERIFY_CODE] URL:", `${api}/api/auth/verify-code`);
    console.log("📡 [VERIFY_CODE] Email:", email.trim());
    console.log("📡 [VERIFY_CODE] Code:", code.trim());

    try {
      // Timeout kontrolü için AbortController
      // Render.com free tier'da cold start 30-60 saniye sürebilir
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error(
          "⏱️ [VERIFY_CODE] Timeout: İstek 60 saniye içinde tamamlanamadı"
        );
      }, 60000); // 60 saniye timeout (Render.com cold start için)

      const res = await apiFetch(`${api}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.log(`✅ [VERIFY_CODE] Response alındı (${elapsed}ms)`);
      console.log("📡 [VERIFY_CODE] Status:", res.status, res.statusText);
      console.log(
        "📡 [VERIFY_CODE] Headers:",
        Object.fromEntries(res.headers.entries())
      );

      const contentType = res.headers.get("content-type");
      console.log("📡 [VERIFY_CODE] Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(
          "❌ [VERIFY_CODE] JSON olmayan yanıt:",
          text.substring(0, 200)
        );
        throw new Error("Sunucudan geçersiz yanıt geldi.");
      }

      const data = await res.json();
      console.log(
        "📡 [VERIFY_CODE] Sunucu Yanıtı:",
        JSON.stringify(data, null, 2)
      );

      if (!res.ok) {
        console.error(`❌ [VERIFY_CODE] HTTP ${res.status} hatası:`, data);
        throw new Error(
          data.error || data.message || `Doğrulama başarısız (${res.status}).`
        );
      }

      if (data?.token) {
        console.log("✅ [VERIFY_CODE] Başarılı! Token alındı.");
        setSession(data.token, data.user);
        router.replace("/(tabs)/wizard");
      } else {
        console.error("❌ [VERIFY_CODE] Token bulunamadı:", data);
        throw new Error("Token alınamadı, lütfen tekrar deneyin.");
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error(`🔥 [VERIFY_CODE] Hata (${elapsed}ms):`, err);
      console.error("🔥 [VERIFY_CODE] Hata tipi:", err?.name);
      console.error("🔥 [VERIFY_CODE] Hata mesajı:", err?.message);
      console.error("🔥 [VERIFY_CODE] Hata stack:", err?.stack);

      if (err?.name === "AbortError") {
        setApiError(
          "Sunucu yanıt vermiyor. Render.com free tier'da ilk istek 30-60 saniye sürebilir. Lütfen tekrar deneyin."
        );
      } else if (err?.message?.includes("fetch")) {
        setApiError(
          "Bağlantı hatası: Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin."
        );
      } else {
        setApiError(err.message || "Kod doğrulanamadı.");
      }
    } finally {
      const elapsed = Date.now() - startTime;
      console.log(`🏁 [VERIFY_CODE] İşlem tamamlandı (${elapsed}ms)`);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <LinearGradient colors={["#2C3E50", "#000000"]} style={styles.overlay}>
        <View style={styles.content}>
          {/* Logo ve Başlık */}
          <Text style={styles.logo}>Pratik Şef</Text>
          <Text style={styles.tagline}>
            {step === "request"
              ? "E-posta ile giriş yap"
              : "Doğrulama kodunu gir"}
          </Text>

          {/* Hata Mesajı Kutusu */}
          {apiError && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>⚠️ {apiError}</Text>
            </View>
          )}

          {/* ADIM 1: E-posta Girişi */}
          {step === "request" && (
            <>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setApiError(null); // Yazarken hatayı sil
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="E-posta adresiniz"
                placeholderTextColor="#999"
                style={styles.input}
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.primary }]}
                disabled={loading}
                onPress={requestCode}
              >
                {loading ? (
                  <View style={{ alignItems: "center" }}>
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={[
                        styles.btnTxt,
                        { marginTop: 8, fontSize: 12, opacity: 0.8 },
                      ]}
                    >
                      Sunucu uyanıyor, lütfen bekleyin...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.btnTxt}>Kodu Gönder</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ADIM 2: Kod Doğrulama */}
          {step === "verify" && (
            <View style={{ width: "100%" }}>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setApiError(null);
                }}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  { textAlign: "center", letterSpacing: 5, fontSize: 20 },
                ]}
                maxLength={6}
              />

              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: theme.primary, marginBottom: 10 },
                ]}
                disabled={loading}
                onPress={verifyCode}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnTxt}>Giriş Yap</Text>
                )}
              </TouchableOpacity>

              {/* Geri Dön Butonu */}
              <TouchableOpacity
                onPress={() => {
                  setStep("request");
                  setApiError(null);
                }}
              >
                <Text
                  style={{ color: "#ccc", textAlign: "center", marginTop: 10 }}
                >
                  E-postayı değiştir
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { alignItems: "center", paddingHorizontal: 32, width: "100%" },
  logo: { fontSize: 36, fontWeight: "800", color: "#fff", marginBottom: 8 },
  tagline: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: "#fff",
    width: "100%",
    marginBottom: 16,
    fontSize: 16,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  banner: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(231, 76, 60, 0.9)",
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#c0392b",
  },
  bannerText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
});
