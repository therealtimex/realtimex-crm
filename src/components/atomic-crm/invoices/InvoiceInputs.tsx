import {
  useTranslate,
  useGetIdentity,
  required,
  useDataProvider,
  useRecordContext,
} from "ra-core";
import { useQuery } from "@tanstack/react-query";
import { useWatch, useFormContext } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { TextInput } from "@/components/ds/admin/text-input";
import { DateInput } from "@/components/ds/admin/date-input";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ds/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ds/ui/popover";
import { useState } from "react";

import { InvoiceItemsInput } from "./InvoiceItemsInput";

export const InvoiceInputs = () => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { setValue } = useFormContext();
  const location = useLocation();
  const record = useRecordContext();
  const company_id = useWatch({ name: "company_id" });
  const dataProvider = useDataProvider();

  // Fetch business profile for default terms
  const { data: businessProfile } = useQuery({
    queryKey: ["business_profile"],
    queryFn: async () => {
      try {
        const { data } = await dataProvider.getOne("business_profile", {
          id: 1,
        });
        return data;
      } catch {
        return null;
      }
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["invoice_templates"],
    queryFn: async () => {
      const { data } = await dataProvider.getList("invoice_templates", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      return data;
    },
  });

  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  // Pre-fill from router state (e.g. when coming from CompanyShow)
  useEffect(() => {
    const state = location.state as { record?: any };
    if (state?.record) {
      const { company_id, contact_id, deal_id } = state.record;
      if (company_id) setValue("company_id", company_id);
      if (contact_id) setValue("contact_id", contact_id);
      if (deal_id) setValue("deal_id", deal_id);
    }
  }, [location.state, setValue]);

  // Pre-fill default terms from business profile for NEW invoices
  useEffect(() => {
    if (!record && businessProfile) {
      if (businessProfile.default_payment_terms) {
        setValue("payment_terms", businessProfile.default_payment_terms);
      }
      if (businessProfile.default_terms_and_conditions) {
        setValue(
          "terms_and_conditions",
          businessProfile.default_terms_and_conditions,
        );
      }
    }
  }, [record, businessProfile, setValue]);

  // Clear dependent fields when company changes (optional but good UX)
  // We need a ref to track previous company_id if we want to avoid initial clear
  // But for now, let's just let the user re-select if they change company.
  useEffect(() => {
    if (company_id === null || company_id === undefined) return;
    // Logic to clear contact/deal if they don't belong to new company?
    // Ideally we check if current contact.company_id == new company_id
    // But simpler to just rely on the filter.
  }, [company_id]);

  const suggestInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    setValue("invoice_number", `INV-${year}-${random}`);
  };

  const loadTemplate = async (templateId: number) => {
    try {
      const { data: template } = await dataProvider.getOne(
        "invoice_templates",
        { id: templateId },
      );
      const { data: items } = await dataProvider.getList(
        "invoice_template_items",
        {
          filter: { template_id: templateId },
          pagination: { page: 1, perPage: 100 },
          sort: { field: "sort_order", order: "ASC" },
        },
      );

      if (template.default_payment_terms) {
        setValue("payment_terms", template.default_payment_terms);
      }
      if (template.default_terms_and_conditions) {
        setValue("terms_and_conditions", template.default_terms_and_conditions);
      }
      if (template.default_due_days) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.default_due_days);
        setValue("due_date", dueDate.toISOString().split("T")[0]);
      }

      // Transform template items to invoice items and calculate totals
      // Note: Current Invoice system only supports Global Discount.
      // We bake per-item discounts from templates into the unit_price.
      const invoiceItems = items.map((item: any) => {
        let unitPrice = Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 0;
        const taxRate = Number(item.tax_rate) || 0;

        // Apply per-item discount to unit price
        const discountAmount = Number(item.discount_amount) || 0;
        const discountType = item.discount_type || "percentage";

        if (discountAmount > 0) {
          if (discountType === "percentage") {
            unitPrice = unitPrice * (1 - discountAmount / 100);
          } else {
            unitPrice = Math.max(0, unitPrice - discountAmount);
          }
        }

        const lineTotal = quantity * unitPrice;
        const taxAmount = (lineTotal * taxRate) / 100;
        const lineTotalWithTax = lineTotal + taxAmount;

        return {
          description: item.description,
          item_description: item.item_description,
          quantity: quantity,
          unit_price: unitPrice,
          tax_rate: taxRate,
          line_total: lineTotal,
          tax_amount: taxAmount,
          line_total_with_tax: lineTotalWithTax,
        };
      });

      setValue("items", invoiceItems);

      setIsTemplateOpen(false);
      // Optionally notify success
    } catch (error) {
      console.error("Error loading template", error);
    }
  };

  const currencyChoices = [
    { id: "USD", name: "USD - US Dollar" },
    { id: "EUR", name: "EUR - Euro" },
    { id: "GBP", name: "GBP - British Pound" },
    { id: "CAD", name: "CAD - Canadian Dollar" },
    { id: "JPY", name: "JPY - Japanese Yen" },
    { id: "KRW", name: "KRW - Korean Won" },
    { id: "AUD", name: "AUD - Australian Dollar" },
    { id: "CHF", name: "CHF - Swiss Franc" },
  ];

  const statusChoices = [
    { id: "draft", name: translate("resources.invoices.status.draft") },
    { id: "sent", name: translate("resources.invoices.status.sent") },
    { id: "paid", name: translate("resources.invoices.status.paid") },
    { id: "overdue", name: translate("resources.invoices.status.overdue") },
    { id: "cancelled", name: translate("resources.invoices.status.cancelled") },
  ];

  return (
    <div className="space-y-6">
      {/* Invoice Number and Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput
              source="invoice_number"
              label="resources.invoices.fields.invoice_number"
              validate={required()}
              helperText="resources.invoices.helper.invoice_number"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={suggestInvoiceNumber}
            className="mb-6 h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title={
              translate("resources.invoices.action.suggest_number") ||
              "Suggest number"
            }
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput
              source="reference"
              label="resources.invoices.fields.reference"
              helperText="resources.invoices.helper.reference"
            />
          </div>
          <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="mb-6"
                title={
                  translate(
                    "resources.invoice_templates.action.load_template",
                  ) || "Load Template"
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                {translate(
                  "resources.invoice_templates.action.load_template",
                ) || "Template"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="end">
              <Command>
                <CommandInput placeholder="Search templates..." />
                <CommandList>
                  <CommandEmpty>No templates found.</CommandEmpty>
                  <CommandGroup>
                    {templates?.map((template: any) => (
                      <CommandItem
                        key={template.id}
                        value={template.name}
                        onSelect={() => loadTemplate(template.id)}
                      >
                        <div className="flex flex-col">
                          <span>{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Entity References */}
      {/* Entity References */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ReferenceInput source="company_id" reference="companies">
            <AutocompleteInput
              label="resources.invoices.fields.company_id"
              optionText="name"
            />
          </ReferenceInput>
        </div>

        <ReferenceInput
          source="contact_id"
          reference="contacts"
          filter={company_id ? { company_id } : undefined}
        >
          <AutocompleteInput
            label="resources.invoices.fields.contact_id"
            optionText={(record) =>
              record ? `${record.first_name} ${record.last_name}` : ""
            }
            helperText={
              !company_id
                ? translate(
                    "resources.invoices.helper.select_company_for_contacts",
                  )
                : false
            }
          />
        </ReferenceInput>

        <ReferenceInput
          source="deal_id"
          reference="deals"
          filter={company_id ? { company_id } : undefined}
        >
          <AutocompleteInput
            label="resources.invoices.fields.deal_id"
            optionText="name"
            helperText={
              !company_id
                ? translate(
                    "resources.invoices.helper.select_company_for_deals",
                  )
                : false
            }
          />
        </ReferenceInput>
      </div>

      {/* Status and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          source="status"
          label="resources.invoices.fields.status"
          choices={statusChoices}
          defaultValue="draft"
          validate={required()}
        />
        <SelectInput
          source="currency"
          label="resources.invoices.fields.currency"
          choices={currencyChoices}
          defaultValue="USD"
          validate={required()}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4">
        <DateInput
          source="issue_date"
          label="resources.invoices.fields.issue_date"
          validate={required()}
          defaultValue={new Date().toISOString().split("T")[0]}
        />
        <DateInput
          source="due_date"
          label="resources.invoices.fields.due_date"
          validate={required()}
          defaultValue={
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          }
        />
        <DateInput source="paid_at" label="resources.invoices.fields.paid_at" />
      </div>

      {/* Line Items */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">
          {translate("resources.invoices.section.items")}
        </h3>
        <InvoiceItemsInput />
      </div>

      {/* Notes and Terms */}
      <div className="grid grid-cols-1 gap-4">
        <TextInput
          source="notes"
          label="resources.invoices.fields.notes"
          multiline
          rows={3}
        />
        <TextInput
          source="payment_terms"
          label="resources.invoices.fields.payment_terms"
          multiline
          rows={2}
          helperText="resources.invoices.helper.payment_terms"
        />
        <TextInput
          source="terms_and_conditions"
          label="resources.invoices.fields.terms_and_conditions"
          multiline
          rows={3}
        />
      </div>

      {/* Hidden field for sales_id */}
      <input type="hidden" name="sales_id" value={identity?.id || ""} />
    </div>
  );
};
