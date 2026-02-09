import { useState, useEffect } from "react";
import { useTranslate, useNotify, useDataProvider, Form } from "ra-core";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Button } from "@/components/ds/ui/button";
import { TextInput } from "@/components/ds/admin/text-input";
import type { InvoiceTemplate } from "../types";
import { InvoiceItemsInput } from "./InvoiceItemsInput";

interface TemplateEditDialogProps {
  open: boolean;
  onClose: () => void;
  template?: InvoiceTemplate | null;
  onSuccess: () => void;
}

export const TemplateEditDialog = ({
  open,
  onClose,
  template,
  onSuccess,
}: TemplateEditDialogProps) => {
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const [isSaving, setIsSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (template) {
        setIsLoading(true);
        dataProvider
          .getList("invoice_template_items", {
            filter: { template_id: template.id },
            pagination: { page: 1, perPage: 100 },
            sort: { field: "sort_order", order: "ASC" },
          })
          .then(({ data }) => {
            setInitialValues({
              name: template.name,
              description: template.description,
              default_payment_terms: template.default_payment_terms,
              default_terms_and_conditions:
                template.default_terms_and_conditions,
              default_due_days: template.default_due_days || 30,
              items: data || [],
              discount: 0,
              discount_type: "fixed",
            });
            setIsLoading(false);
          })
          .catch((error) => {
            console.error(error);
            notify("Error loading template items", { type: "error" });
            setIsLoading(false);
          });
      } else {
        setInitialValues({
          name: "",
          description: "",
          default_payment_terms: "",
          default_terms_and_conditions: "",
          default_due_days: 30,
          items: [],
          discount: 0,
          discount_type: "fixed",
        });
      }
    } else {
      setInitialValues(null);
    }
  }, [open, template, dataProvider, notify]);

  const handleSave = async (values: any) => {
    if (!values.name) {
      notify("Template name is required", { type: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      let templateId: number;

      const templateData = {
        name: values.name,
        description: values.description,
        default_payment_terms: values.default_payment_terms,
        default_terms_and_conditions: values.default_terms_and_conditions,
        default_due_days: Math.max(
          0,
          values.default_due_days ? parseInt(values.default_due_days) : 30,
        ),
      };

      if (template) {
        // Update existing template
        await dataProvider.update("invoice_templates", {
          id: template.id,
          data: templateData,
          previousData: template,
        });
        templateId = template.id;
        notify(translate("resources.invoice_templates.notification.updated"), {
          type: "success",
        });
      } else {
        // Create new template
        const { data: newTemplate } = await dataProvider.create(
          "invoice_templates",
          {
            data: templateData,
          },
        );
        templateId = newTemplate.id;
        notify(translate("resources.invoice_templates.notification.created"), {
          type: "success",
        });
      }

      // Handle items (Delete existing & Re-create)
      if (template) {
        const { data: existingItems } = await dataProvider.getList(
          "invoice_template_items",
          {
            filter: { template_id: templateId },
            pagination: { page: 1, perPage: 100 },
            sort: { field: "id", order: "ASC" },
          },
        );

        // Delete all old items in parallel
        await Promise.all(
          existingItems.map((item) =>
            dataProvider.delete("invoice_template_items", {
              id: item.id,
              previousData: item,
            }),
          ),
        );
      }

      // Create new items in parallel
      const items = values.items || [];
      await Promise.all(
        items.map((item: any, i: number) =>
          dataProvider.create("invoice_template_items", {
            data: {
              template_id: templateId,
              description: item.description,
              item_description: item.item_description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate || 0,
              discount_amount: item.discount_amount || 0,
              discount_type: item.discount_type || "percentage",
              sort_order: i,
            },
          }),
        ),
      );

      onSuccess();
    } catch (error: any) {
      notify(error.message || "Error saving template", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template
              ? "Edit Template"
              : translate("resources.invoice_templates.action.create")}
          </DialogTitle>
          <DialogDescription>
            Create a reusable template for common invoice configurations
          </DialogDescription>
        </DialogHeader>

        {isLoading || !initialValues ? (
          <div className="py-8 text-center text-muted-foreground">
            {translate("ra.action.loading")}
          </div>
        ) : (
          <Form
            onSubmit={handleSave}
            defaultValues={initialValues}
            mode="onChange"
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <TextInput
                  source="name"
                  label={translate("resources.invoice_templates.fields.name")}
                  placeholder="e.g., Monthly Retainer, Standard Service Package"
                  validate={(value) => (value ? undefined : "Required")}
                />
              </div>

              <div className="grid gap-2">
                <TextInput
                  source="description"
                  label={translate(
                    "resources.invoice_templates.fields.description",
                  )}
                  placeholder="Optional description"
                  multiline
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <TextInput
                  source="default_due_days"
                  label={translate(
                    "resources.invoice_templates.fields.default_due_days",
                  )}
                  type="number"
                />
              </div>

              <div className="grid gap-2">
                <TextInput
                  source="default_payment_terms"
                  label={translate(
                    "resources.invoice_templates.fields.default_payment_terms",
                  )}
                  placeholder="e.g., Net 30, Due on Receipt"
                />
              </div>

              <div className="grid gap-2">
                <TextInput
                  source="default_terms_and_conditions"
                  label={translate(
                    "resources.invoice_templates.fields.default_terms_and_conditions",
                  )}
                  multiline
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {translate("resources.invoice_templates.fields.items")}
                </label>
                <InvoiceItemsInput />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {translate("ra.action.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? translate("ra.action.saving")
                  : translate("ra.action.save")}
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
