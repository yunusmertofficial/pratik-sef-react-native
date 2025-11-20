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

    setLoading(true);
    setApiError(null); // Önceki hataları temizle

    try {
      console.log("📡 İstek gönderiliyor:", `${api}/api/auth/request-code`);

      const res = await fetch(`${api}/api/auth/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      // Yanıtın JSON olup olmadığını kontrol et (HTML dönerse patlamasın)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Sunucudan geçersiz yanıt geldi (HTML hatası olabilir)."
        );
      }

      const data = await res.json();
      console.log("📡 Sunucu Yanıtı:", data);

      if (!res.ok) {
        // HTTP hatası (400, 500 vs.) varsa fırlat
        throw new Error(data.error || data.message || "Sunucu hatası oluştu.");
      }

      if (data?.ok) {
        // Başarılı
        setStep("verify");
      } else {
        // HTTP 200 ama mantıksal hata
        throw new Error(data.error || "Kod gönderilemedi.");
      }
    } catch (err: any) {
      console.error("🔥 Hata Detayı:", err);
      setApiError(err.message || "Bağlantı hatası: Sunucuya ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setApiError("Lütfen gelen kodu girin.");
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch(`${api}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await res.json();
      console.log("📡 Doğrulama Yanıtı:", data);

      if (!res.ok) {
        throw new Error(data.error || data.message || "Doğrulama başarısız.");
      }

      if (data?.token) {
        setSession(data.token, data.user);
        router.replace("/(tabs)/wizard");
      } else {
        throw new Error("Token alınamadı, lütfen tekrar deneyin.");
      }
    } catch (err: any) {
      console.error("🔥 Doğrulama Hatası:", err);
      setApiError(err.message || "Kod doğrulanamadı.");
    } finally {
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
                  <ActivityIndicator color="#fff" />
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
