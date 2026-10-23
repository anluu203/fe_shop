export type ReportPeriod = "day" | "week" | "month" | "year";
export interface ReportQuery {
  from: string;
  to: string;
  period: ReportPeriod;
}
export interface RevenueBucket {
  key: string;
  label: string;
  revenue: string;
  orders: number;
  quantity: number;
}
export interface BestSeller {
  productId: string;
  name: string;
  quantity: number;
  revenue: string;
}
export interface RevenueReport {
  query: ReportQuery;
  revenue: string;
  orders: number;
  quantity: number;
  averageOrder: string;
  buckets: RevenueBucket[];
  bestSellers: BestSeller[];
}
