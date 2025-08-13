export declare function base64url(input: Buffer | string): string;
export declare function sha256Hex(text: string): string;
export declare function hmacSha256Hex(key: string, text: string): string;
export type KeySet = {
    currentKid: string;
    currentKey: string;
    prevKid?: string;
    prevKey?: string;
};
export declare function loadKeySetFromEnv(): KeySet;
export declare function verifySignature(keySet: KeySet, kid: string, payload: string, sigHex: string): boolean;
//# sourceMappingURL=crypto.d.ts.map