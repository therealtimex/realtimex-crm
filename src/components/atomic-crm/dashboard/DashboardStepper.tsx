import { CheckCircle, Circle, X } from "lucide-react";
import { useTranslate, useUpdate, type Identifier } from "ra-core";
import { Link } from "react-router";
import { CreateButton } from "@/components/ds/admin/create-button";
import { Progress } from "@/components/ds/ui/progress";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent } from "@/components/ds/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

import { ContactImportButton } from "../contacts/ContactImportButton";
import useAppBarHeight from "../misc/useAppBarHeight";

export const DashboardStepper = ({
  step,
  contactId,
}: {
  step: number;
  contactId?: Identifier;
}) => {
  const translate = useTranslate();
  const appbarHeight = useAppBarHeight();
  const [update] = useUpdate();

  const handleDismiss = () => {
    update("business_profile", {
      id: 1,
      data: { onboarding_completed: true },
      previousData: { onboarding_completed: false },
    });
  };

  return (
    <div
      className="flex justify-center items-center"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <Card className="w-full max-w-[600px] relative">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Dismiss onboarding checklist for everyone</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <CardContent className="px-6 pt-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">
              {translate("crm.dashboard.stepper.title")}
            </h3>
            <div className="w-[150px]">
              <Progress value={(step / 3) * 100} className="mb-2" />
              <div className="text-right text-sm">
                {translate("crm.dashboard.stepper.progress", {
                  step,
                  total: 3,
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-12">
            <div className="flex gap-8 items-center">
              <CheckCircle className="h-5 w-5 text-success" />
              <h4 className="font-bold">
                {translate("crm.dashboard.stepper.install")}
              </h4>
            </div>
            <div className="flex gap-8 items-start">
              {step > 1 ? (
                <CheckCircle className="mt-1 h-5 w-5 text-success" />
              ) : (
                <Circle className="text-muted-foreground w-5 h-5 mt-1" />
              )}

              <div className="flex flex-col gap-4">
                <h4 className="font-bold">
                  {translate("crm.dashboard.stepper.add_contact")}
                </h4>

                <div className="flex gap-8">
                  <CreateButton
                    label={translate("crm.dashboard.stepper.new_contact")}
                    resource="contacts"
                  />
                  <ContactImportButton />
                </div>
              </div>
            </div>
            <div className="flex gap-8 items-start">
              <Circle className="text-muted-foreground w-5 h-5 mt-1" />
              <div className="flex flex-col gap-4">
                <h4 className="font-bold">
                  {translate("crm.dashboard.stepper.add_note")}
                </h4>
                <p>{translate("crm.dashboard.stepper.add_note_hint")}</p>
                <Button asChild disabled={step < 2} className="w-[100px]">
                  <Link to={`/contacts/${contactId}/show`}>
                    {translate("crm.dashboard.stepper.add_note_button")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
