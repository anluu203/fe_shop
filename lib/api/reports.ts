import { api } from "./client";
import type { ReportQuery, RevenueReport } from "../types/reports";
export const reportApi = {
  getRevenue: (query: ReportQuery) =>
    api.get<RevenueReport>("/admin/reports/revenue", { ...query }),
};
