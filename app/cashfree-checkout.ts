type CashfreeCheckout = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: "_modal" | "_self" | "_blank";
  }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeCheckout;
  }
}

function loadCashfreeSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(Error("Could not load Cashfree checkout. Please retry."));
    };
    document.head.appendChild(script);
  });
}

export async function openCashfree(order: any) {
  if (!order?.paymentSessionId) {
    throw Error("Cashfree payment session was not created.");
  }

  await loadCashfreeSdk();
  const cashfree = window.Cashfree?.({
    mode: order.mode === "live" ? "production" : "sandbox",
  });

  if (!cashfree) throw Error("Cashfree checkout could not start.");

  await cashfree.checkout({
    paymentSessionId: order.paymentSessionId,
    redirectTarget: "_modal",
  });
}
