import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as StellarSdk from "npm:@stellar/stellar-sdk@12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PI_API_BASE = "https://api.minepi.com";

// Horizon URLs & passphrases matching the official pi-nodejs SDK
const HORIZON_CONFIG = {
  "Pi Network": {
    url: "https://api.mainnet.minepi.com",
    passphrase: "Pi Network",
  },
  "Pi Testnet": {
    url: "https://api.testnet.minepi.com",
    passphrase: "Pi Testnet",
  },
};

// Helper: call Pi Platform API (v2)
async function piApi(
  path: string,
  apiKey: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  const res = await fetch(`${PI_API_BASE}/v2${path}`, {
    method,
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error_message || data.error || `Pi API ${res.status}`;
    console.error("Pi API error:", JSON.stringify(data));
    throw new Error(errMsg);
  }
  return data;
}

// Build, sign, and submit the Stellar transaction – mirrors pi-nodejs SDK's buildA2UTransaction + submitPayment
async function submitPaymentToBlockchain(
  payment: any,
  keypair: StellarSdk.Keypair,
): Promise<string> {
  const { amount, identifier, from_address, to_address, network } = payment;

  // Determine horizon URL + passphrase from the payment's network field
  const horizonCfg = HORIZON_CONFIG[network as keyof typeof HORIZON_CONFIG];
  if (!horizonCfg) {
    throw new Error(`Unknown network: ${network}. Expected "Pi Network" or "Pi Testnet".`);
  }

  if (from_address !== keypair.publicKey()) {
    throw new Error("Wallet private seed does not match payment from_address");
  }

  const horizon = new StellarSdk.Horizon.Server(horizonCfg.url);
  const myAccount = await horizon.loadAccount(keypair.publicKey());
  const baseFee = await horizon.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(myAccount, {
    fee: baseFee.toString(),
    networkPassphrase: horizonCfg.passphrase,
    timebounds: await horizon.fetchTimebounds(180),
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: to_address,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      }),
    )
    .addMemo(StellarSdk.Memo.text(identifier))
    .build();

  transaction.sign(keypair);
  const result = await horizon.submitTransaction(transaction);

  // @ts-ignore - id exists on successful response
  const txid = result.id || result.hash;
  if (!txid) {
    throw new Error("Transaction submitted but no txid returned");
  }
  return txid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const piApiKey = Deno.env.get("PI_API_KEY");
  const walletSeed = Deno.env.get("PI_WALLET_PRIVATE_SEED");
  if (!piApiKey || !walletSeed) {
    return new Response(
      JSON.stringify({ error: "PI_API_KEY or PI_WALLET_PRIVATE_SEED not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const keypair = StellarSdk.Keypair.fromSecret(walletSeed);

  try {
    const body = await req.json();
    const { action } = body;

    // ─── ACTION: send (all-in-one) ───
    // Full A2U flow following the pi-nodejs SDK:
    // 1. createPayment  2. submitPayment (blockchain)  3. completePayment
    if (action === "send") {
      const { userUid, amount, memo, metadata, supabaseUserId } = body;
      if (!userUid || !amount || !memo) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userUid, amount, memo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Step 1: Create payment on Pi Platform (matches SDK's createPayment)
      const paymentData = {
        payment: {
          amount: Number(amount),
          memo,
          metadata: metadata || {},
          uid: userUid,
        },
      };
      const created = await piApi("/payments", piApiKey, "POST", paymentData);
      const paymentId = created.identifier;
      console.log("A2U step 1 - created:", paymentId, "network:", created.network);

      // Store in DB
      await supabase.from("pi_payments").insert({
        user_id: supabaseUserId || "00000000-0000-0000-0000-000000000000",
        payment_id: paymentId,
        amount: Number(amount),
        memo,
        status: "created",
        metadata: {
          ...(metadata || {}),
          direction: "app_to_user",
          pi_uid: userUid,
          network: created.network,
        },
      });

      // Step 2: Submit to blockchain (matches SDK's submitPayment)
      const txid = await submitPaymentToBlockchain(created, keypair);
      console.log("A2U step 2 - submitted, txid:", txid);

      // Update DB
      await supabase
        .from("pi_payments")
        .update({ status: "submitted", txid })
        .eq("payment_id", paymentId);

      // Step 3: Complete on Pi Platform (matches SDK's completePayment)
      const completed = await piApi(
        `/payments/${paymentId}/complete`,
        piApiKey,
        "POST",
        { txid },
      );
      console.log("A2U step 3 - completed:", completed.identifier);

      // Final DB update
      await supabase
        .from("pi_payments")
        .update({ status: "completed" })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          txid,
          payment: completed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: create ───
    if (action === "create") {
      const { userUid, amount, memo, metadata } = body;
      if (!userUid || !amount || !memo) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userUid, amount, memo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const created = await piApi("/payments", piApiKey, "POST", {
        payment: { amount: Number(amount), memo, metadata: metadata || {}, uid: userUid },
      });

      await supabase.from("pi_payments").insert({
        user_id: body.supabaseUserId || "00000000-0000-0000-0000-000000000000",
        payment_id: created.identifier,
        amount: Number(amount),
        memo,
        status: "created",
        metadata: { ...(metadata || {}), direction: "app_to_user", pi_uid: userUid, network: created.network },
      });

      return new Response(
        JSON.stringify({ success: true, paymentId: created.identifier, fromAddress: created.from_address, toAddress: created.to_address, network: created.network }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: submit ───
    if (action === "submit") {
      const { paymentId } = body;
      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: "Missing paymentId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const payment = await piApi(`/payments/${paymentId}`, piApiKey);
      if (payment.transaction?.txid) {
        return new Response(
          JSON.stringify({ error: "Payment already has a linked transaction", txid: payment.transaction.txid }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const txid = await submitPaymentToBlockchain(payment, keypair);

      await supabase
        .from("pi_payments")
        .update({ status: "submitted", txid })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({ success: true, txid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: complete ───
    if (action === "complete") {
      const { paymentId, txid } = body;
      if (!paymentId || !txid) {
        return new Response(
          JSON.stringify({ error: "Missing paymentId or txid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const completed = await piApi(`/payments/${paymentId}/complete`, piApiKey, "POST", { txid });

      await supabase
        .from("pi_payments")
        .update({ status: "completed", txid })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({ success: true, payment: completed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: cancel ───
    if (action === "cancel") {
      const { paymentId } = body;
      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: "Missing paymentId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cancelled = await piApi(`/payments/${paymentId}/cancel`, piApiKey, "POST");

      await supabase
        .from("pi_payments")
        .update({ status: "cancelled" })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({ success: true, payment: cancelled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: get_incomplete ───
    if (action === "get_incomplete") {
      const data = await piApi("/payments/incomplete_server_payments", piApiKey);
      return new Response(
        JSON.stringify({ success: true, payments: data.incomplete_server_payments }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: create, submit, complete, send, cancel, get_incomplete" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("A2U payment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
