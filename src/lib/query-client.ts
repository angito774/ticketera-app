import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

import { QUERY_STALE_TIME_MS } from "@/lib/query-config";

/** Un `QueryClient` por request en el servidor, para precargar y pasar a `HydrationBoundary`. */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: { queries: { staleTime: QUERY_STALE_TIME_MS } },
    }),
);
