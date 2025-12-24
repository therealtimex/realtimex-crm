import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeysTab } from "./ApiKeysTab";
import { WebhooksTab } from "./WebhooksTab";
import { IngestionChannelsTab } from "./IngestionChannelsTab";
import { FileUpload } from "../activities/FileUpload";

export const IntegrationsPage = () => {
  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys, webhooks, and ingestion channels to integrate Atomic CRM with external
          systems.
        </p>
      </div>

      <Tabs defaultValue="ingestion">
        <TabsList className="mb-4">
          <TabsTrigger value="ingestion">Ingestion Channels</TabsTrigger>
          <TabsTrigger value="file-upload">File Upload</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks (Outbound)</TabsTrigger>
        </TabsList>

        <TabsContent value="ingestion">
          <IngestionChannelsTab />
        </TabsContent>

        <TabsContent value="file-upload">
          <FileUpload />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

IntegrationsPage.path = "/integrations";
