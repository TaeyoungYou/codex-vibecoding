import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { inspectWebp } from "../_shared/webp.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const reply = (status: number, body: object) =>
  Response.json(body, { status, headers: cors });
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST")
    return reply(405, { error: "method not allowed" });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const publishable =
      JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ??
      Deno.env.get("SUPABASE_ANON_KEY");
    const secret =
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishable || !secret)
      return reply(503, { error: "server configuration required" });
    const bearer = request.headers.get("authorization") ?? "";
    if (!bearer.startsWith("Bearer "))
      return reply(401, { error: "authentication required" });
    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.auth.getUser(bearer.slice(7));
    if (error || !data.user)
      return reply(401, { error: "authentication required" });
    const body = await request.json();
    if (typeof body.assetId !== "string")
      return reply(400, { error: "invalid asset" });
    const reservation = await userClient.rpc("read_media_upload", {
      p_asset_id: body.assetId,
    });
    if (
      reservation.error ||
      !reservation.data ||
      reservation.data.ownerId !== data.user.id
    )
      return reply(403, { error: "owner required" });
    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const downloaded = await admin.storage
      .from("guestbook-media")
      .download(reservation.data.objectPath);
    if (
      downloaded.error ||
      !downloaded.data ||
      downloaded.data.type !== "image/webp"
    )
      return reply(400, { error: "missing or invalid object" });
    const dimensions = inspectWebp(
      new Uint8Array(await downloaded.data.arrayBuffer()),
    );
    if (
      reservation.data.kind === "drawing_preview" &&
      (dimensions.width !== 900 || dimensions.height !== 600)
    )
      return reply(400, { error: "invalid drawing dimensions" });
    const verified = await admin.rpc("verify_media_upload", {
      p_asset_id: body.assetId,
      p_owner_id: data.user.id,
      p_bytes: dimensions.bytes,
      p_width: dimensions.width,
      p_height: dimensions.height,
    });
    if (verified.error)
      return reply(400, { error: "asset verification failed" });
    return reply(200, dimensions);
  } catch {
    return reply(400, { error: "invalid media request" });
  }
});
