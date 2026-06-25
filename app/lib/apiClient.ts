import type {
  DashboardStats,
  RevenuePoint,
  Project,
  UserProfile,
  EarningsBreakdownItem,
} from "../store/types";

export async function fetchDashboardFromAPI(): Promise<{
  stats: DashboardStats;
  revenueTrend: RevenuePoint[];
  recentProjects: Project[];
}> {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchUserFromAPI(): Promise<UserProfile> {
  const response = await fetch("/api/user");
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchEarningsFromAPI(): Promise<{
  totalEarnings: string;
  totalTrend: number;
  trendLabel: string;
  totalFiat: { value: string; change: number };
  cryptoRevenue: { value: string; change: number };
  pendingPayouts: { value: string; change: number };
  breakdown: EarningsBreakdownItem[];
}> {
  const response = await fetch("/api/earnings");
  if (!response.ok) {
    throw new Error(`Failed to fetch earnings: ${response.statusText}`);
  }
  return response.json();
}
