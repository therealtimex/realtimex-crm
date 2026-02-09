import { Download } from "lucide-react";
import { useGetOne, useRecordContext, useTranslate } from "ra-core";
import { Button } from "@/components/ds/ui/button";
import type { Contact, Company } from "../types";
import { exportToVCard } from "./exportToVCard";

export const ExportVCardButton = () => {
  const contact = useRecordContext<Contact>();
  const translate = useTranslate();

  // Fetch the company data on mount
  const { data: company } = useGetOne<Company>(
    "companies",
    { id: contact?.company_id },
    { enabled: !!contact?.company_id },
  );

  const handleExport = () => {
    if (!contact) return;
    const vCard = exportToVCard(contact, company);
    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${contact.first_name}_${contact.last_name}.vcf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!contact) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="h-6 cursor-pointer"
    >
      <Download className="w-4 h-4" />
      {translate("crm.contact.action.export_vcard")}
    </Button>
  );
};
