import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: string;
  message: string;
  source: string;
  log_type?: string;
  ip?: string;
  event_type?: string;
  dev_id?: string;
  log_id?: string;
  hostname?: string;
  dest_ip?: string;
}

export interface LogFilters {
  ip?: string;
  severity?: string;
  source?: string;
  logType?: string;
  dateTime?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface FilterOptions {
  ips: string[];
  sources: string[];
  severities: string[];
  logTypes: string[];
}

const buildLogParams = (filters?: LogFilters) => {
  const params = new URLSearchParams();
  if (!filters) return params;

  const keys: (keyof LogFilters)[] = ['ip', 'severity', 'source', 'logType', 'dateTime', 'startDate', 'endDate'];
  keys.forEach(key => {
    const value = filters[key];
    if (value && value !== 'any') {
      params.append(key, value.toString());
    }
  });

  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset !== undefined) params.append('offset', filters.offset.toString());

  return params;
};

export const fetchLogs = async (filters?: LogFilters): Promise<LogEntry[]> => {
  const params = buildLogParams(filters);

  const response = await fetch(`/api/logs?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  const data = await response.json();
  return data.logs;
};

export const useLogs = (filters?: LogFilters | null) => {
  return useQuery({
    queryKey: ['logs', filters],
    queryFn: () => fetchLogs(filters || undefined),
  });
};

export const useLogsInfinite = (filters?: Omit<LogFilters, 'limit' | 'offset'> | null) => {
  return useInfiniteQuery({
    queryKey: ['logs-infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchLogs({ ...filters, limit: 50, offset: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length * 50 : undefined;
    },
  });
};

export const useLogFilterOptions = () => {
  return useQuery({
    queryKey: ['log-filter-options'],
    queryFn: async (): Promise<FilterOptions> => {
      const response = await fetch('/api/logs/filter-options');
      if (!response.ok) {
        throw new Error('Fetch options failed');
      }
      const data = await response.json();
      return data.options;
    },
  });
};
