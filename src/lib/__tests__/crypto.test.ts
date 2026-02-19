import { describe, it, expect, beforeAll } from "vitest"
import crypto from "crypto"

// Set a test encryption key before importing the module
beforeAll(() => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex")
})

describe("AES-256-GCM Crypto", () => {
  it("encrypts and decrypts a string correctly", async () => {
    const { encrypt, decrypt } = await import("../crypto")

    const original = "Dados sensíveis: CPF 123.456.789-00"
    const encrypted = encrypt(original)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(original)
  })

  it("produces different ciphertext for same plaintext (random IV)", async () => {
    const { encrypt } = await import("../crypto")

    const text = "Same text"
    const enc1 = encrypt(text)
    const enc2 = encrypt(text)

    expect(enc1).not.toBe(enc2)
  })

  it("encrypted output has correct format (iv:tag:data)", async () => {
    const { encrypt } = await import("../crypto")

    const encrypted = encrypt("test")
    const parts = encrypted.split(":")

    expect(parts).toHaveLength(3)
    // IV = 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24)
    // Tag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32)
    // Encrypted data should be non-empty hex
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it("throws on invalid encrypted data format", async () => {
    const { decrypt } = await import("../crypto")

    expect(() => decrypt("invalid")).toThrow("Invalid encrypted data format")
    expect(() => decrypt("a:b")).toThrow("Invalid encrypted data format")
  })

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../crypto")

    const encrypted = encrypt("secret")
    const parts = encrypted.split(":")
    // Tamper with the encrypted data
    const tampered = `${parts[0]}:${parts[1]}:${"ff".repeat(parts[2].length / 2)}`

    expect(() => decrypt(tampered)).toThrow()
  })

  it("handles empty strings", async () => {
    const { encrypt, decrypt } = await import("../crypto")

    const encrypted = encrypt("")
    expect(decrypt(encrypted)).toBe("")
  })

  it("handles unicode characters", async () => {
    const { encrypt, decrypt } = await import("../crypto")

    const unicode = "Ação de recuperação — crédito nº 42 • R$ 1.000,00"
    const encrypted = encrypt(unicode)
    expect(decrypt(encrypted)).toBe(unicode)
  })

  it("handles long strings", async () => {
    const { encrypt, decrypt } = await import("../crypto")

    const long = "A".repeat(10000)
    const encrypted = encrypt(long)
    expect(decrypt(encrypted)).toBe(long)
  })
})

describe("Crypto - missing key", () => {
  it("throws when ENCRYPTION_KEY is not set", async () => {
    const originalKey = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY

    // Need fresh import to test the getKey function
    const cryptoModule = await import("../crypto")

    expect(() => cryptoModule.encrypt("test")).toThrow("ENCRYPTION_KEY")

    // Restore
    process.env.ENCRYPTION_KEY = originalKey
  })
})
