import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ds/ui/tabs";
import { ApiKeysTab } from "./ApiKeysTab";
import { WebhooksTab } from "./WebhooksTab";
import { IngestionChannelsTab } from "./IngestionChannelsTab";
import { FileUpload } from "../activities/FileUpload";
import { useTranslate } from "ra-core";

export const IntegrationsPage = () => {
  const translate = useTranslate();
  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {translate("crm.integrations.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {translate("crm.integrations.description")}
        </p>
      </div>

      <Tabs defaultValue="ingestion">
        <TabsList className="mb-4">
          <TabsTrigger value="ingestion">
            {translate("crm.integrations.tabs.ingestion")}
          </TabsTrigger>
          <TabsTrigger value="file-upload">
            {translate("crm.integrations.tabs.file_upload")}
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            {translate("crm.integrations.tabs.api_keys")}
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            {translate("crm.integrations.tabs.webhooks")}
          </TabsTrigger>
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
