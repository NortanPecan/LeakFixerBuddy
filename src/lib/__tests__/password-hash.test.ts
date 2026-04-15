import { describe, expect, it } from "vitest";
import {
  createLegacyPasswordHash,
  hashPassword,
  isScryptPasswordHash,
  verifyPassword,
} from "@/lib/password-hash";

describe("password hashing", () => {
  it("stores new passwords with the scrypt envelope", async () => {
    const storedHash = await hashPassword("correct horse battery staple");

    expect(isScryptPasswordHash(storedHash)).toBe(true);
    expect(storedHash.split("$")).toHaveLength(7);
  });

  it("verifies a current scrypt hash without requesting rehash", async () => {
    const storedHash = await hashPassword("secret-password");

    await expect(verifyPassword("secret-password", storedHash)).resolves.toEqual({
      valid: true,
      needsRehash: false,
    });
  });

  it("rejects wrong passwords for current hashes", async () => {
    const storedHash = await hashPassword("secret-password");

    await expect(verifyPassword("wrong-password", storedHash)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it("verifies legacy SHA-256 hashes and flags them for migration", async () => {
    const salt = "legacy-salt";
    const storedHash = createLegacyPasswordHash("old-password", salt);

    await expect(verifyPassword("old-password", storedHash, salt)).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
  });

  it("rejects legacy hashes when salt is missing", async () => {
    const storedHash = createLegacyPasswordHash("old-password", "legacy-salt");

    await expect(verifyPassword("old-password", storedHash, null)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });
});
