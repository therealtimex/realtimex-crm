import { useMutation } from "@tanstack/react-query";
import { KeyRound, MoreHorizontal, RefreshCw } from "lucide-react";
import * as React from "react";
import {
  useDataProvider,
  useGetIdentity,
  useListContext,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from "ra-core";
import { CreateButton } from "@/components/ds/admin/create-button";
import { DataTable } from "@/components/ds/admin/data-table";
import { ExportButton } from "@/components/ds/admin/export-button";
import { List } from "@/components/ds/admin/list";
import { SearchInput } from "@/components/ds/admin/search-input";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ds/ui/dropdown-menu";
import { Skeleton } from "@/components/ds/ui/skeleton";

import { TopToolbar } from "../layout/TopToolbar";
import useAppBarHeight from "../misc/useAppBarHeight";
import type { CrmDataProvider } from "../providers/types";

const SalesListActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <ExportButton />
      <CreateButton label={translate("crm.user.action.create")} />
    </TopToolbar>
  );
};

const filters = [<SearchInput source="q" alwaysOn />];

const OptionsField = (_props: { label?: string | boolean }) => {
  const record = useRecordContext();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <div className="flex flex-row gap-1">
      {record.administrator && (
        <Badge
          variant="outline"
          className="border-blue-300 dark:border-blue-700"
        >
          {translate("crm.user.field.administrator")}
        </Badge>
      )}
      {record.disabled && (
        <Badge
          variant="outline"
          className="border-orange-300 dark:border-orange-700"
        >
          {translate("crm.user.field.disabled")}
        </Badge>
      )}
    </div>
  );
};

const RowActions = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);

  const { mutate: resendInvite, isPending: isInvitePending } = useMutation({
    mutationFn: async () => {
      return dataProvider.resendInvite(record.id);
    },
    onSuccess: () => {
      notify(translate("crm.user.notification.invite_sent"));
      setInviteDialogOpen(false);
      refresh();
    },
    onError: () => {
      notify(translate("crm.user.notification.invite_error"), {
        type: "error",
      });
      setInviteDialogOpen(false);
    },
  });

  const { mutate: resetPassword, isPending: isResetPending } = useMutation({
    mutationFn: async () => {
      return dataProvider.resetPassword(record.id);
    },
    onSuccess: () => {
      notify(translate("crm.user.notification.reset_sent"));
      setResetDialogOpen(false);
      refresh();
    },
    onError: () => {
      notify(translate("crm.user.notification.reset_error"), { type: "error" });
      setResetDialogOpen(false);
    },
  });

  if (!record) return null;

  // Determine which action to show based on confirmation status
  const isConfirmed = record.email_confirmed_at !== null;
  const isDisabled = record.disabled === true;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{translate("ra.action.open_menu")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {translate("crm.user.field.email_actions")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isConfirmed && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setInviteDialogOpen(true);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {translate("crm.user.action.resend_invite")}
            </DropdownMenuItem>
          )}
          {isConfirmed && !isDisabled && (
            <DropdownMenuItem onClick={() => setResetDialogOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              {translate("crm.user.action.send_password_reset")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resend Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {translate("crm.user.dialog.resend_invitation.title")}
            </DialogTitle>
            <DialogDescription>
              {translate("crm.user.dialog.resend_invitation.description", {
                email: record.email,
              })}
              <br />
              <br />
              {translate("crm.user.dialog.resend_invitation.fresh_link")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setInviteDialogOpen(false);
              }}
              disabled={isInvitePending}
            >
              {translate("crm.user.action.cancel")}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                resendInvite();
              }}
              disabled={isInvitePending}
            >
              {isInvitePending
                ? translate("crm.user.action.sending")
                : translate("crm.user.action.send_invitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {translate("crm.user.dialog.reset_password.title")}
            </DialogTitle>
            <DialogDescription>
              {translate("crm.user.dialog.reset_password.description", {
                email: record.email,
              })}
              <br />
              <br />
              {translate("crm.user.dialog.reset_password.reset_link")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setResetDialogOpen(false);
              }}
              disabled={isResetPending}
            >
              {translate("crm.user.action.cancel")}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                resetPassword();
              }}
              disabled={isResetPending}
            >
              {isResetPending
                ? translate("crm.user.action.sending")
                : translate("crm.user.action.send_reset_link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export function SalesList() {
  return (
    <List
      filters={filters}
      actions={<SalesListActions />}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <SalesListLayout />
    </List>
  );
}

const SalesListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  // Show loading skeleton while identity or data is loading
  if (!identity || isPending) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  // Show empty state when no data
  if (!data?.length && !hasFilters) {
    return <SalesEmpty />;
  }

  return (
    <DataTable>
      <DataTable.Col source="first_name" />
      <DataTable.Col source="last_name" />
      <DataTable.Col source="email" />
      <DataTable.Col label={false}>
        <OptionsField />
      </DataTable.Col>
      <DataTable.Col label={false}>
        <RowActions />
      </DataTable.Col>
    </DataTable>
  );
};

const SalesEmpty = () => {
  const appbarHeight = useAppBarHeight();
  const translate = useTranslate();
  return (
    <div
      className="flex flex-col justify-center items-center gap-3"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <img src="./img/empty.svg" alt={translate("crm.user.empty.title")} />
      <div className="flex flex-col gap-0 items-center">
        <h6 className="text-lg font-bold">
          {translate("crm.user.empty.title")}
        </h6>
        <p className="text-sm text-muted-foreground text-center mb-4">
          {translate("crm.user.empty.description")}
        </p>
      </div>
      <div className="flex flex-row gap-2">
        <CreateButton label={translate("crm.user.action.create")} />
      </div>
    </div>
  );
};
