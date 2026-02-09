import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Notification } from "@/components/ds/admin/notification";
import { Error } from "@/components/ds/admin/error";
import { Skeleton } from "@/components/ds/ui/skeleton";

import Header from "./Header";
import { LocaleSync } from "../root/LocaleSync";

export const Layout = ({ children }: { children: ReactNode }) => (
  <>
    <LocaleSync />
    <Header />
    <main className="w-full pt-20 px-4 sm:px-5 lg:px-6" id="main-content">
      <ErrorBoundary FallbackComponent={Error}>
        <Suspense fallback={<Skeleton className="h-12 w-12 rounded-full" />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </main>
    <Notification />
  </>
);
