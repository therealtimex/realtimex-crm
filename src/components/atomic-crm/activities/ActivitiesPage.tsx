import { ActivityFeed } from "./ActivityFeed";

export const ActivitiesPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Activity Timeline</h1>
        <p className="text-muted-foreground mt-2">
          All activities from ingestion channels and manual entries
        </p>
      </div>

      <ActivityFeed />
    </div>
  );
};
