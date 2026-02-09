import { useState, useEffect } from "react";
import { Merge, CircleX, AlertTriangle, ArrowDown } from "lucide-react";
import {
  useDataProvider,
  useRecordContext,
  useGetList,
  useGetManyReference,
  required,
  Form,
  useNotify,
  useRedirect,
  useTranslate,
} from "ra-core";
import type { Identifier } from "ra-core";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ds/ui/dialog";
import { Button } from "@/components/ds/ui/button";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds/ui/alert";
import type { Company } from "../types";

export const CompanyMergeButton = () => {
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const translate = useTranslate();
  return (
    <>
      <Button
        variant="outline"
        className="h-6 cursor-pointer"
        size="sm"
        onClick={() => setMergeDialogOpen(true)}
      >
        <Merge className="w-4 h-4" />
        {translate("crm.company.action.merge_with_another")}
      </Button>
      <CompanyMergeDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
      />
    </>
  );
};

interface CompanyMergeDialogProps {
  open: boolean;
  onClose: () => void;
}

const CompanyMergeDialog = ({ open, onClose }: CompanyMergeDialogProps) => {
  const loserCompany = useRecordContext<Company>();
  const notify = useNotify();
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const translate = useTranslate();
  const [winnerId, setWinnerId] = useState<Identifier | null>(null);
  const [suggestedWinnerId, setSuggestedWinnerId] = useState<Identifier | null>(
    null,
  );
  const [isMerging, setIsMerging] = useState(false);
  const { mutateAsync } = useMutation({
    mutationKey: [
      "companies",
      "merge",
      { loserId: loserCompany?.id, winnerId },
    ],
    mutationFn: async () => {
      return dataProvider.mergeCompanies(loserCompany?.id, winnerId);
    },
  });

  // Find potential companies with matching name
  const { data: matchingCompanies } = useGetList(
    "companies",
    {
      filter: {
        name: loserCompany?.name,
        "id@neq": `${loserCompany?.id}`, // Exclude current company
      },
      pagination: { page: 1, perPage: 10 },
    },
    { enabled: open && !!loserCompany },
  );

  // Get counts of items to be merged
  const canFetchCounts = open && !!loserCompany && !!winnerId;
  const { total: contactsCount } = useGetManyReference(
    "contacts",
    {
      target: "company_id",
      id: loserCompany?.id,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: canFetchCounts },
  );

  const { total: dealsCount } = useGetManyReference(
    "deals",
    {
      target: "company_id",
      id: loserCompany?.id,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: canFetchCounts },
  );

  useEffect(() => {
    if (matchingCompanies && matchingCompanies.length > 0) {
      const suggestedWinnerId = matchingCompanies[0].id;
      setSuggestedWinnerId(suggestedWinnerId);
      setWinnerId(suggestedWinnerId);
    }
  }, [matchingCompanies]);

  const handleMerge = async () => {
    if (!winnerId || !loserCompany) {
      notify(translate("crm.company.merge.select_company"), {
        type: "warning",
      });
      return;
    }

    try {
      setIsMerging(true);
      await mutateAsync();
      setIsMerging(false);
      notify(translate("crm.company.merge.success"), { type: "success" });
      redirect(`/companies/${winnerId}/show`);
      onClose();
    } catch (error) {
      setIsMerging(false);
      notify(translate("crm.company.merge.error"), { type: "error" });
      console.error("Merge failed:", error);
    }
  };

  if (!loserCompany) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="md:min-w-lg max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translate("crm.company.merge.title")}</DialogTitle>
          <DialogDescription>
            {translate("crm.company.merge.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="font-medium text-sm">
              {translate("crm.company.merge.current_company")}
            </p>
            <div className="font-medium text-sm mt-4">{loserCompany.name}</div>

            <div className="flex justify-center my-4">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>

            <p className="font-medium text-sm mb-2">
              {translate("crm.company.merge.target_contact")}
            </p>
            <Form>
              <ReferenceInput
                source="winner_id"
                reference="companies"
                filter={{ "id@neq": loserCompany.id }}
              >
                <AutocompleteInput
                  label=""
                  optionText="name"
                  validate={required()}
                  onChange={setWinnerId}
                  defaultValue={suggestedWinnerId}
                  helperText={false}
                />
              </ReferenceInput>
            </Form>
          </div>

          {winnerId && (
            <>
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  {translate("crm.company.merge.what_will_be_merged")}
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {contactsCount != null && contactsCount > 0 && (
                    <li>
                      •{" "}
                      {translate("crm.company.merge.contacts_to_merge", {
                        smart_count: contactsCount,
                      })}
                    </li>
                  )}
                  {dealsCount != null && dealsCount > 0 && (
                    <li>
                      •{" "}
                      {translate("crm.company.merge.deals_to_merge", {
                        smart_count: dealsCount,
                      })}
                    </li>
                  )}
                  {loserCompany.context_links?.length > 0 && (
                    <li>
                      •{" "}
                      {translate("crm.company.merge.links_to_merge", {
                        smart_count: loserCompany.context_links.length,
                      })}
                    </li>
                  )}
                  {!contactsCount &&
                    !dealsCount &&
                    !loserCompany.context_links?.length && (
                      <li className="text-muted-foreground/60">
                        {translate("crm.company.merge.no_data")}
                      </li>
                    )}
                </ul>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {translate("crm.company.merge.warning_title")}
                </AlertTitle>
                <AlertDescription>
                  {translate("crm.company.merge.warning_message")}
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isMerging}>
            <CircleX />
            {translate("crm.activity.cancel")}
          </Button>
          <Button onClick={handleMerge} disabled={!winnerId || isMerging}>
            <Merge />
            {isMerging
              ? translate("crm.company.merge.merging")
              : translate("crm.company.merge.merge_companies")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
