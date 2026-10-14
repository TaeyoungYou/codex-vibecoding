import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

// This is a real embedded PostgreSQL engine, with ONLY the Auth/Storage schema
// fixtures needed by SQL. It is not a Supabase Auth/Storage/Realtime acceptance test.
const db = new PGlite();
const owner = randomUUID(),
  other = randomUUID();
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant insert on storage.objects to authenticated;
    create publication supabase_realtime;
  `);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && !f.includes("cleanup_schedule"))
    .sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.query("insert into auth.users values ($1),($2)", [owner, other]);
  await as(owner, () => db.query("select public.set_nickname('같은이름')"));
  await as(other, () => db.query("select public.set_nickname('같은이름')"));
}, 30000);
afterAll(async () => {
  await db.close();
});
async function as<T>(
  uid: string | null,
  action: () => Promise<T>,
  role = "authenticated",
) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    uid ?? "",
  ]);
  try {
    return await action();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
  }
}
async function save(
  id: string,
  version: number | null,
  text: string,
  images: string[] = [],
  drawing: unknown = null,
) {
  const result = await db.query<{
    value: { id: string; text: string; version: number; images: unknown[] };
  }>("select public.save_entry($1,$2,$3,$4,$5) as value", [
    id,
    version,
    text,
    images,
    drawing,
  ]);
  return result.rows[0].value;
}
async function read(id: string) {
  return (
    await db.query<{ value: unknown }>(
      "select public.read_entry($1) as value",
      [id],
    )
  ).rows[0].value;
}
async function uploaded(entry: string, kind = "image") {
  const result = await as(owner, () =>
    db.query<{ value: { assetId: string; objectPath: string } }>(
      "select public.reserve_media_upload($1,$2) as value",
      [entry, kind],
    ),
  );
  const asset = result.rows[0].value;
  await as(owner, () =>
    db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('guestbook-media',$1,$2)",
      [asset.objectPath, { size: 123, mimetype: "image/webp" }],
    ),
  );
  await as(
    null,
    () =>
      db.query("select public.verify_media_upload($1,$2,123,$3,$4)", [
        asset.assetId,
        owner,
        kind === "image" ? 100 : 900,
        kind === "image" ? 100 : 600,
      ]),
    "service_role",
  );
  return asset;
}
describe("PostgreSQL guestbook ownership and transactions", () => {
  it("allows owner CRUD and public read, rejects stale versions and duplicate creates", async () => {
    const id = randomUUID();
    await as(owner, async () => {
      expect(await save(id, null, "첫 글")).toMatchObject({
        id,
        version: 1,
        text: "첫 글",
      });
      await expect(save(id, null, "중복")).rejects.toMatchObject({
        code: "PT409",
      });
      expect(await save(id, 1, "수정")).toMatchObject({ version: 2 });
      await expect(save(id, 1, "오래된 수정")).rejects.toMatchObject({
        code: "PT409",
      });
      expect(await read(id)).toMatchObject({ text: "수정", version: 2 });
    });
    expect(await as(null, () => read(id), "anon")).toMatchObject({
      text: "수정",
    });
    await as(owner, () => db.query("select public.delete_entry($1,2)", [id]));
    expect(await read(id)).toBeNull();
  });
  it("rejects other-user writes, direct DML and private reads with identical nicknames", async () => {
    const id = randomUUID();
    await as(owner, () => save(id, null, "소유권"));
    await as(other, async () => {
      await expect(save(id, 1, "탈취")).rejects.toMatchObject({
        code: "PT403",
      });
      await expect(
        db.query("select public.delete_entry($1,1)", [id]),
      ).rejects.toMatchObject({ code: "PT403" });
      await expect(
        db.query("update public.entries set body='탈취' where id=$1", [id]),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        db.query("select * from guestbook_private.drawing_strokes"),
      ).rejects.toMatchObject({ code: "42501" });
      expect(
        (await db.query("select * from public.profiles where id=$1", [owner]))
          .rows,
      ).toEqual([]);
      await expect(
        db.query("select public.claim_media_cleanup_job(120,5)"),
      ).rejects.toMatchObject({ code: "42501" });
    });
    expect(await read(id)).toMatchObject({ text: "소유권", version: 1 });
  });
  it("rolls back invalid empty, Unicode and missing-media saves", async () => {
    const id = randomUUID();
    await as(owner, async () => {
      await save(id, null, "🙂".repeat(1000));
      await expect(save(id, 1, "🙂".repeat(1001))).rejects.toMatchObject({
        code: "PT400",
      });
      await expect(save(id, 1, " ")).rejects.toMatchObject({ code: "PT400" });
      await expect(save(id, 1, "\n\t\u00a0\u3000")).rejects.toMatchObject({
        code: "PT400",
      });
      await expect(
        db.query("select public.set_nickname($1)", ["\u00a0\u3000"]),
      ).rejects.toMatchObject({ code: "PT400" });
      await expect(save(id, 1, "変更", [randomUUID()])).rejects.toMatchObject({
        code: "PT400",
      });
    });
    expect(await read(id)).toMatchObject({
      text: "🙂".repeat(1000),
      version: 1,
    });
  });
  it("requires a reserved owned path and verified real object, queues detached media atomically", async () => {
    const id = randomUUID();
    const a = await uploaded(id);
    await as(other, async () => {
      await expect(
        db.query(
          "insert into storage.objects(bucket_id,name) values('guestbook-media',$1)",
          [a.objectPath + "bad"],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await as(owner, async () => {
      await save(id, null, "", [a.assetId]);
      await expect(save(id, 1, "", [])).rejects.toMatchObject({
        code: "PT400",
      });
      expect((await read(id)) as object).toMatchObject({ version: 1 });
    });
    expect(
      (
        await db.query(
          "select * from guestbook_private.media_cleanup_jobs where asset_id=$1",
          [a.assetId],
        )
      ).rows,
    ).toHaveLength(0);
    await as(owner, () => save(id, 1, "画像を削除"));
    expect(
      (
        await db.query(
          "select status from guestbook_private.media_cleanup_jobs where asset_id=$1",
          [a.assetId],
        )
      ).rows,
    ).toEqual([{ status: "pending" }]);
    await as(owner, () =>
      expect(save(id, 2, "再添付", [a.assetId])).rejects.toMatchObject({
        code: "PT400",
      }),
    );
  });
  it("keeps drawing strokes private and validates coordinates before changing content", async () => {
    const id = randomUUID(),
      a = await uploaded(id, "drawing_preview");
    const doc = {
      formatVersion: 1,
      width: 900,
      height: 600,
      strokes: [
        {
          tool: "pen",
          color: "#171717",
          widthPx: 3,
          points: [{ x: 0.5, y: 0.5 }],
        },
      ],
    };
    await as(owner, () =>
      save(id, null, "", [], {
        previewAssetId: a.assetId,
        strokesJson: JSON.stringify(doc),
      }),
    );
    expect(await read(id)).not.toHaveProperty("strokesJson");
    await as(owner, async () => {
      expect(
        (
          await db.query<{ value: object }>(
            "select public.read_entry_for_edit($1) as value",
            [id],
          )
        ).rows[0].value,
      ).toHaveProperty("strokesJson", JSON.stringify(doc));
      doc.strokes[0].points[0].x = 1.1;
      await expect(
        save(id, 1, "bad", [], {
          previewAssetId: a.assetId,
          strokesJson: JSON.stringify(doc),
        }),
      ).rejects.toMatchObject({ code: "PT400" });
      expect(await read(id)).toMatchObject({ version: 1, text: "" });
    });
    await as(other, () =>
      expect(
        db.query("select public.read_entry_for_edit($1)", [id]),
      ).rejects.toMatchObject({ code: "PT403" }),
    );
  });
  it("protects current assets, expires unused files after 24h and rejects stale worker tokens", async () => {
    const id = randomUUID(),
      a = await uploaded(id);
    await as(owner, () => save(id, null, "", [a.assetId]));
    await as(
      null,
      () =>
        db.query("select public.enqueue_expired_media(now()+interval '1 day')"),
      "service_role",
    );
    expect(
      (
        await db.query(
          "select status from guestbook_private.media_assets where id=$1",
          [a.assetId],
        )
      ).rows[0],
    ).toEqual({ status: "attached" });
    await as(owner, () => db.query("select public.delete_entry($1,1)", [id]));
    // Drain earlier pending jobs so this claim is deterministic.
    await db.query(
      "update guestbook_private.media_cleanup_jobs set status='done' where asset_id<>$1",
      [a.assetId],
    );
    const claim = (
      await as(
        null,
        () =>
          db.query<{ value: { id: string; claimToken: string } }>(
            "select public.claim_media_cleanup_job(120,5) as value",
          ),
        "service_role",
      )
    ).rows[0].value;
    await db.query(
      "update guestbook_private.media_cleanup_jobs set lease_until=now()-interval '1 second' where id=$1",
      [claim.id],
    );
    const reclaim = (
      await as(
        null,
        () =>
          db.query<{ value: { id: string; claimToken: string } }>(
            "select public.claim_media_cleanup_job(120,5) as value",
          ),
        "service_role",
      )
    ).rows[0].value;
    expect(reclaim.claimToken).not.toBe(claim.claimToken);
    expect(
      (
        await as(
          null,
          () =>
            db.query<{ value: boolean }>(
              "select public.complete_media_cleanup_job($1,$2) as value",
              [claim.id, claim.claimToken],
            ),
          "service_role",
        )
      ).rows[0].value,
    ).toBe(false);
    expect(
      (
        await as(
          null,
          () =>
            db.query<{ value: boolean }>(
              "select public.complete_media_cleanup_job($1,$2) as value",
              [reclaim.id, reclaim.claimToken],
            ),
          "service_role",
        )
      ).rows[0].value,
    ).toBe(true);
    const abandoned = await uploaded(randomUUID());
    await db.query(
      "update guestbook_private.media_assets set created_at=now()-interval '25 hours' where id=$1",
      [abandoned.assetId],
    );
    await as(
      null,
      () => db.query("select public.enqueue_expired_media(now())"),
      "service_role",
    );
    expect(
      (
        await db.query(
          "select status from guestbook_private.media_assets where id=$1",
          [abandoned.assetId],
        )
      ).rows[0],
    ).toEqual({ status: "delete_pending" });
  });
});
