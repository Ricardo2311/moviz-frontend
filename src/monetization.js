// Monetização nativa: anúncio recompensado (AdMob) e assinatura Premium (RevenueCat).
// No navegador (dev) nada disso existe — as funções informam via isNativeMonetization().
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
const isNative = Capacitor.isNativePlatform();

const ADMOB_TESTING = process.env.REACT_APP_ADMOB_TESTING !== 'false';
const REWARDED_AD_ID = platform === 'ios'
  ? process.env.REACT_APP_ADMOB_REWARDED_IOS
  : process.env.REACT_APP_ADMOB_REWARDED_ANDROID;
const REVENUECAT_KEY = platform === 'ios'
  ? process.env.REACT_APP_REVENUECAT_IOS_KEY
  : process.env.REACT_APP_REVENUECAT_ANDROID_KEY;

export function isNativeMonetization() {
  return isNative;
}

export function isPurchaseAvailable() {
  return isNative && Boolean(REVENUECAT_KEY);
}

/* ── AdMob ─────────────────────────────────────────────────────────────── */

let adsReady = null;

function ensureAds() {
  if (!adsReady) {
    adsReady = (async () => {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({ initializeForTesting: ADMOB_TESTING });
      if (platform === 'ios') {
        // ATT: sem permissão o AdMob segue funcionando, só com anúncios não personalizados.
        await AdMob.requestTrackingAuthorization().catch(() => {});
      }
      return AdMob;
    })().catch((err) => {
      adsReady = null;
      throw err;
    });
  }
  return adsReady;
}

/**
 * Mostra um anúncio recompensado. A recompensa NÃO é creditada aqui: o Google
 * avisa o backend pelo callback SSV (assinado) usando `userId`.
 * Resolve true se o usuário assistiu até o fim, false se fechou antes.
 */
export async function showRewardedAd(userId) {
  const AdMob = await ensureAds();
  const { RewardAdPluginEvents } = await import('@capacitor-community/admob');
  let rewarded = false;
  const handle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
  try {
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_ID,
      isTesting: ADMOB_TESTING,
      ssv: { userId: String(userId) },
    });
    await AdMob.showRewardVideoAd();
    return rewarded;
  } finally {
    handle.remove();
  }
}

/* ── RevenueCat ────────────────────────────────────────────────────────── */

let purchasesUserId = null;

async function ensurePurchases(userId) {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const appUserID = String(userId);
  if (purchasesUserId === null) {
    await Purchases.configure({ apiKey: REVENUECAT_KEY, appUserID });
  } else if (purchasesUserId !== appUserID) {
    await Purchases.logIn({ appUserID });
  }
  purchasesUserId = appUserID;
  return Purchases;
}

/** Pacotes da oferta atual (mensal/anual) com preço já localizado pela loja. */
export async function fetchPremiumPackages(userId) {
  const Purchases = await ensurePurchases(userId);
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages || [];
}

/** Compra o pacote. Resolve false se o usuário cancelou; lança erro em falha real. */
export async function purchasePremium(userId, aPackage) {
  const Purchases = await ensurePurchases(userId);
  try {
    await Purchases.purchasePackage({ aPackage });
    return true;
  } catch (err) {
    if (err?.userCancelled) return false;
    throw err;
  }
}

export async function restorePremium(userId) {
  const Purchases = await ensurePurchases(userId);
  await Purchases.restorePurchases();
}
