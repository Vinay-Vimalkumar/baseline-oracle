type Finding = {
    id: string;
    status: "widely" | "newly" | "not-baseline";
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
export declare function analyzePath(inputPaths: string[], opts?: {
    target: "widely" | "newly";
    ignore?: string[];
}): Promise<ScanResult>;
export {};
//# sourceMappingURL=index.d.ts.map