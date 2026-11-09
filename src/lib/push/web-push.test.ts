import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, verify } from "node:crypto";
import { encryptPayload, generateVapidKeys, parseSubscription, vapidAuthorization } from "./web-push";

/** Côté navigateur (RFC 8291) : déchiffre ce que le serveur a envoyé. */
function decrypt(body: Buffer, uaEcdh: ReturnType<typeof createECDH>, authSecret: Buffer): string {
  const salt = body.subarray(0, 16);
  const idLen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idLen);
  const ciphertext = body.subarray(21 + idLen);
  const shared = uaEcdh.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaEcdh.getPublicKey(), asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);
  assert.equal(plain.at(-1), 2, "délimiteur de dernier enregistrement");
  return plain.subarray(0, -1).toString("utf8");
}

function browserSubscription() {
  const ua = createECDH("prime256v1");
  ua.generateKeys();
  const auth = randomBytes(16);
  return {
    ua,
    auth,
    sub: {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: ua.getPublicKey().toString("base64url"), auth: auth.toString("base64url") },
    },
  };
}

describe("encryptPayload", () => {
  it("reproduit le vecteur de test de la RFC 8291 (annexe A)", () => {
    const as = createECDH("prime256v1");
    as.setPrivateKey(Buffer.from("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", "base64url"));
    const body = encryptPayload(
      Buffer.from("When I grow up, I want to be a watermelon"),
      {
        endpoint: "https://fcm.googleapis.com/x",
        keys: {
          p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
          auth: "BTBZMqHH6r4Tts7J_aSIgg",
        },
      },
      Buffer.from("DGv6ra1nlYgDCS1FRnbzlw", "base64url"),
      as,
    );
    assert.equal(
      body.toString("base64url"),
      "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
    );
  });

  it("produit un message que le navigateur sait déchiffrer", () => {
    const { ua, auth, sub } = browserSubscription();
    const body = encryptPayload(Buffer.from('{"title":"Nouvelle note"}'), sub);
    assert.equal(body.readUInt32BE(16), 4096);
    assert.equal(decrypt(body, ua, auth), '{"title":"Nouvelle note"}');
  });
});

describe("vapidAuthorization", () => {
  it("signe un jeton ES256 vérifiable avec la clé publique annoncée", () => {
    const keys = { ...generateVapidKeys(), subject: "https://bloomy.example" };
    const header = vapidAuthorization("https://web.push.apple.com/QGx", keys, Date.parse("2026-11-09T12:00:00Z"));
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    assert.equal(k, keys.publicKey);

    const [h, c, s] = token.split(".");
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    assert.equal(claims.aud, "https://web.push.apple.com");
    assert.equal(claims.sub, "https://bloomy.example");

    const pub = Buffer.from(keys.publicKey, "base64url");
    const key = createPublicKey({
      format: "jwk",
      key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") },
    });
    const ok = verify("sha256", Buffer.from(`${h}.${c}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    assert.ok(ok);
  });
});

describe("parseSubscription", () => {
  const { sub } = browserSubscription();

  it("accepte les services de push connus", () => {
    assert.ok(parseSubscription(sub));
    assert.ok(parseSubscription({ ...sub, endpoint: "https://web.push.apple.com/abc" }));
    assert.ok(parseSubscription({ ...sub, endpoint: "https://updates.push.services.mozilla.com/wpush/v2/x" }));
  });

  it("refuse toute autre adresse (anti-SSRF) et les clés mal formées", () => {
    assert.equal(parseSubscription({ ...sub, endpoint: "https://evil.example/fcm.googleapis.com" }), null);
    assert.equal(parseSubscription({ ...sub, endpoint: "https://fcm.googleapis.com.evil.example/x" }), null);
    assert.equal(parseSubscription({ ...sub, endpoint: "http://fcm.googleapis.com/x" }), null);
    assert.equal(parseSubscription({ ...sub, endpoint: "https://127.0.0.1/x" }), null);
    assert.equal(parseSubscription({ ...sub, keys: { ...sub.keys, auth: "court" } }), null);
    assert.equal(parseSubscription(null), null);
  });
});
