import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateChannelDialog = ({
  open,
  onClose,
}: CreateChannelDialogProps) => {
  const [providerCode, setProviderCode] = useState<string>("twilio");
  const [name, setName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate a cryptographically secure random ingestion key
      const ingestionKey = "ik_live_" + crypto.randomUUID().replace(/-/g, '');

      const config: any = {};
      if (authToken) {
          config.auth_token = authToken;
      }

      await dataProvider.create("ingestion_providers", {
        data: {
          name,
          provider_code: providerCode,
          is_active: true,
          config,
          ingestion_key: ingestionKey
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion_providers"] });
      notify("Ingestion Channel created successfully");
      onClose();
      // Reset form
      setName("");
      setAuthToken("");
      setProviderCode("twilio");
    },
    onError: (error: Error) => {
      notify(`Failed to create channel: ${error.message}`, { type: "error" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Ingestion Channel</DialogTitle>
          <DialogDescription>
            Configure a new source for incoming activities.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              placeholder="e.g. US Support Line"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={providerCode} onValueChange={setProviderCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio (Voice/SMS)</SelectItem>
                <SelectItem value="postmark">Postmark (Email)</SelectItem>
                <SelectItem value="generic">Generic / Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {providerCode === "twilio" && (
              <div className="grid gap-2">
                <Label htmlFor="token">Auth Token (Validation)</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Twilio Auth Token"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Required to validate inbound requests.</p>
              </div>
          )}
          
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
