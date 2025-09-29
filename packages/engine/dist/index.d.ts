/**
 * Types
 */
type BaselineStatus = "widely" | "newly" | "not-baseline";
type Finding = {
    id: string;
    status: BaselineStatus;
    risk: number;
    files: {
        path: string;
        loc?: number;
    }[];
};
type ScanResult = {
    summary: {
        target: "widely" | "newly";
        riskScore: number;
    };
    features: Finding[];
};
/**
 * Main entry
 */
export declare function analyzePath(inputPaths: string[], opts?: {
    target: "widely" | "newly";
    ignore?: string[];
}): Promise<ScanResult>;
export {};
//# sourceMappingURL=index.d.ts.map