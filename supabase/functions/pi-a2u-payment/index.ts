import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as StellarSdk from "npm:@stellar/stellar-sdk@12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PI_API_BASE = "https://api.minepi.com";
const PI_HORIZON_MAINNET = "https://api.mainnet.minepi.com";
const PI_MAINNET_PASSPHRASE = "Pi Network";

// Helper: call Pi Platform API
async function piApi(
  path: string,
  apiKey: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  const res = await fetch(`${PI_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_message || data.error || `Pi API ${res.status}`);
  }
  return data;
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

  try {
    const body = await req.json();
    const { action } = body;

    // ─── ACTION: create ───
    // Creates an A2U payment on Pi Platform, returns paymentId
    if (action === "create") {
      const { userUid, amount, memo, metadata } = body;
      if (!userUid || !amount || !memo) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userUid, amount, memo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const paymentData = {
        payment: {
          amount: Number(amount),
          memo,
          metadata: metadata || {},
          uid: userUid,
        },
      };

      const created = await piApi("/v2/payments", piApiKey, "POST", paymentData);
      const paymentId = created.identifier;

      console.log("A2U payment created:", paymentId);

      // Store in database
      await supabase.from("pi_payments").insert({
        user_id: body.supabaseUserId || "00000000-0000-0000-0000-000000000000",
        payment_id: paymentId,
        amount: Number(amount),
        memo,
        status: "created",
        metadata: {
          ...(metadata || {}),
          direction: "app_to_user",
          pi_uid: userUid,
          from_address: created.from_address,
          to_address: created.to_address,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentId,
          fromAddress: created.from_address,
          toAddress: created.to_address,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: submit ───
    // Builds a Stellar transaction, signs it, submits to Pi Blockchain
    if (action === "submit") {
      const { paymentId } = body;
      if (!paymentId) {
        return new Response(
          JSON.stringify({ error: "Missing paymentId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get the payment details from Pi
      const payment = await piApi(`/v2/payments/${paymentId}`, piApiKey);

      if (payment.transaction?.txid) {
        return new Response(
          JSON.stringify({ error: "Payment already has a linked transaction", txid: payment.transaction.txid }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { amount, from_address, to_address } = payment;

      // Build and sign Stellar transaction
      const keypair = StellarSdk.Keypair.fromSecret(walletSeed);

      if (from_address !== keypair.publicKey()) {
        return new Response(
          JSON.stringify({ error: "Wallet private seed does not match payment from_address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const horizon = new StellarSdk.Horizon.Server(PI_HORIZON_MAINNET);
      const account = await horizon.loadAccount(keypair.publicKey());
      const baseFee = await horizon.fetchBaseFee();

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: baseFee.toString(),
        networkPassphrase: PI_MAINNET_PASSPHRASE,
        timebounds: await horizon.fetchTimebounds(180),
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: to_address,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          }),
        )
        .addMemo(StellarSdk.Memo.text(paymentId))
        .build();

      transaction.sign(keypair);
      const submitResult = await horizon.submitTransaction(transaction);

      // @ts-ignore - id exists on successful response
      const txid = submitResult.id || submitResult.hash;

      if (!txid) {
        throw new Error("Transaction submitted but no txid returned");
      }

      console.log("A2U transaction submitted, txid:", txid);

      // Update database
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
    // Completes the payment on Pi Platform after blockchain tx
    if (action === "complete") {
      const { paymentId, txid } = body;
      if (!paymentId || !txid) {
        return new Response(
          JSON.stringify({ error: "Missing paymentId or txid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const completed = await piApi(
        `/v2/payments/${paymentId}/complete`,
        piApiKey,
        "POST",
        { txid },
      );

      console.log("A2U payment completed:", completed.identifier);

      // Update database
      await supabase
        .from("pi_payments")
        .update({ status: "completed", txid })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({ success: true, payment: completed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION: send (all-in-one) ───
    // Full A2U flow: create → submit → complete
    if (action === "send") {
      const { userUid, amount, memo, metadata, supabaseUserId } = body;
      if (!userUid || !amount || !memo) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userUid, amount, memo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Step 1: Create payment on Pi Platform
      const paymentData = {
        payment: {
          amount: Number(amount),
          memo,
          metadata: metadata || {},
          uid: userUid,
        },
      };
      const created = await piApi("/v2/payments", piApiKey, "POST", paymentData);
      const paymentId = created.identifier;
      console.log("A2U step 1 - created:", paymentId);

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
        },
      });

      // Step 2: Build + sign + submit Stellar transaction
      const keypair = StellarSdk.Keypair.fromSecret(walletSeed);
      const { from_address, to_address } = created;

      if (from_address !== keypair.publicKey()) {
        throw new Error("Wallet seed mismatch with from_address");
      }

      const horizon = new StellarSdk.Horizon.Server(PI_HORIZON_MAINNET);
      const account = await horizon.loadAccount(keypair.publicKey());
      const baseFee = await horizon.fetchBaseFee();

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: baseFee.toString(),
        networkPassphrase: PI_MAINNET_PASSPHRASE,
        timebounds: await horizon.fetchTimebounds(180),
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: to_address,
            asset: StellarSdk.Asset.native(),
            amount: Number(amount).toString(),
          }),
        )
        .addMemo(StellarSdk.Memo.text(paymentId))
        .build();

      transaction.sign(keypair);
      const submitResult = await horizon.submitTransaction(transaction);

      // @ts-ignore
      const txid = submitResult.id || submitResult.hash;
      console.log("A2U step 2 - submitted, txid:", txid);

      // Update DB
      await supabase
        .from("pi_payments")
        .update({ status: "submitted", txid })
        .eq("payment_id", paymentId);

      // Step 3: Complete on Pi Platform
      const completed = await piApi(
        `/v2/payments/${paymentId}/complete`,
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

    // ─── ACTION: get_incomplete ───
    // Returns incomplete server payments
    if (action === "get_incomplete") {
      const data = await piApi(
        "/v2/payments/incomplete_server_payments",
        piApiKey,
      );
      return new Response(
        JSON.stringify({ success: true, payments: data.incomplete_server_payments }),
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

      const cancelled = await piApi(
        `/v2/payments/${paymentId}/cancel`,
        piApiKey,
        "POST",
      );

      await supabase
        .from("pi_payments")
        .update({ status: "cancelled" })
        .eq("payment_id", paymentId);

      return new Response(
        JSON.stringify({ success: true, payment: cancelled }),
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
