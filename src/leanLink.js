const LEAN_SDK_URL = "https://cdn.leantech.me/link/loader/prod/sa/latest/lean-link-loader.min.js";
let loaderPromise;

export function loadLeanSdk(documentRef = document) {
  if (globalThis.Lean?.connect) return Promise.resolve(globalThis.Lean);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const existing = documentRef.querySelector(`script[src="${LEAN_SDK_URL}"]`);
    const script = /** @type {HTMLScriptElement} */ (existing || documentRef.createElement("script"));
    script.addEventListener("load", () => globalThis.Lean?.connect ? resolve(globalThis.Lean) : reject(new Error("لم يتم تحميل Lean LinkSDK")));
    script.addEventListener("error", () => reject(new Error("تعذر تحميل واجهة ربط Lean")));
    if (!existing) {
      script.src = LEAN_SDK_URL;
      script.async = true;
      documentRef.head.appendChild(script);
    }
  });
  return loaderPromise;
}

export async function connectLeanAccount(session, {
  onResult,
} = /** @type {{ onResult?: (result: any) => void }} */ ({})) {
  const Lean = await loadLeanSdk();
  const result = await new Promise((resolve) => {
    Lean.connect({
      app_token: session.appToken,
      access_token: session.accessToken,
      customer_id: session.customerId,
      permissions: session.permissions,
      sandbox: Boolean(session.sandbox),
      language: "ar",
      account_type: "PERSONAL",
      show_consent_explanation: true,
      success_redirect_url: globalThis.location?.href || "",
      fail_redirect_url: globalThis.location?.href || "",
      customization: {
        theme_color: "#007087",
        button_text_color: "#ffffff",
        button_border_radius: "10",
      },
      callback: (value) => resolve(value || { status: "ERROR" }),
    });
  });
  onResult?.(result);
  return result;
}
