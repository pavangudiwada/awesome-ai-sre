import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-12 w-full max-w-3xl" />
      <Skeleton className="h-24 w-full max-w-4xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-96 w-full" />)}
      </div>
    </main>
  );
}
