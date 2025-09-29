type Finding = {
    id: string;
    status: "widely" | "newly" | "not-baseline";
    risk: number;
    files: {
        path: string;
        loc?: number;
    }[];
};
type Result = {
    summary: {
        target: "widely" | "newly";
        riskScore: number;
    };
    features: Finding[];
};
export declare function renderReport(results: Result, outFile: string): void;
export {};
//# sourceMappingURL=index.d.ts.map