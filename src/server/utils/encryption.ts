import sodium from "libsodium-wrappers";
import { serverEnv } from "@/env/server";

let readyPromise: Promise<void> | null = null;

async function ensureReady() {
  if (!readyPromise) {
    readyPromise = sodium.ready;
  }
  await readyPromise;
}

export async function encryptSecret(plainText: string) {
  await ensureReady();
  const key = sodium.from_base64(serverEnv.ENCRYPTION_KEY, sodium.base64_variants.ORIGINAL);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const messageBytes = sodium.from_string(plainText);
  const cipher = sodium.crypto_secretbox_easy(messageBytes, nonce, key);

  return {
    cipherText: sodium.to_base64(cipher, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
  };
}

export async function decryptSecret(cipherText: string, nonce: string) {
  await ensureReady();
  const key = sodium.from_base64(serverEnv.ENCRYPTION_KEY, sodium.base64_variants.ORIGINAL);
  const nonceBytes = sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL);
  const cipherBytes = sodium.from_base64(cipherText, sodium.base64_variants.ORIGINAL);
  const message = sodium.crypto_secretbox_open_easy(cipherBytes, nonceBytes, key);

  if (!message) {
    throw new Error("Impossible de déchiffrer le secret");
  }

  return sodium.to_string(message);
}
