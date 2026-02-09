import { useState } from "react";
import { useGetList, useTranslate, useNotify, useDataProvider } from "ra-core";
import { Plus, FileText, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { Badge } from "@/components/ds/ui/badge";
import { format } from "date-fns";
import type { InvoiceTemplate } from "../types";
import { TemplateEditDialog } from "./TemplateEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ds/ui/alert-dialog";

export const TemplatesList = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const [editingTemplate, setEditingTemplate] =
    useState<InvoiceTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const {
    data: templates,
    isLoading,
    refetch,
  } = useGetList<InvoiceTemplate>("invoice_templates", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "created_at", order: "DESC" },
  });

  const handleDelete = async (id: number) => {
    try {
      await dataProvider.delete("invoice_templates", {
        id,
        previousData: { id },
      });
      notify(translate("resources.invoice_templates.notification.deleted"), {
        type: "success",
      });
      refetch();
    } catch (error: any) {
      notify(error.message || "Error deleting template", { type: "error" });
    } finally {
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {translate("ra.action.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {translate("resources.invoice_templates.name", { smart_count: 2 })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable invoice templates
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {translate("resources.invoice_templates.action.create")}
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No templates yet. Create your first template to speed up invoice
              creation.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {translate("resources.invoice_templates.action.create")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTemplateToDelete(template.id as number)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {template.default_due_days && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Due in {template.default_due_days} days
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(template.created_at), "PPP")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditDialog
        open={isCreateDialogOpen || !!editingTemplate}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={() => {
          refetch();
          setIsCreateDialogOpen(false);
          setEditingTemplate(null);
        }}
      />

      <AlertDialog
        open={templateToDelete !== null}
        onOpenChange={() => setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {translate("ra.action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && handleDelete(templateToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {translate("ra.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
