import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/ds/ui/alert";
import { Button } from "@/components/ds/ui/button";
import { Checkbox } from "@/components/ds/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ds/ui/dropdown-menu";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ds/ui/select";
import { Separator } from "@/components/ds/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/ui/tabs";

describe("DS UI a11y contracts", () => {
  it("keeps label and input programmatically associated", () => {
    const html = renderToStaticMarkup(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-invalid="true" />
      </div>,
    );

    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("uses alert role for alert component", () => {
    const html = renderToStaticMarkup(<Alert>Failure</Alert>);
    expect(html).toContain('role="alert"');
  });

  it("keeps disabled semantics on button", () => {
    const html = renderToStaticMarkup(<Button disabled>Save</Button>);
    expect(html).toContain("disabled");
  });

  it("keeps checkbox accessible naming hook", () => {
    const html = renderToStaticMarkup(
      <Checkbox aria-label="Accept terms" checked />,
    );
    expect(html).toContain('aria-label="Accept terms"');
    expect(html).toContain('data-slot="checkbox"');
  });

  it("renders tablist and tab roles", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="details">Body</TabsContent>
      </Tabs>,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain("aria-controls");
  });

  it("keeps select trigger labelling hooks", () => {
    const html = renderToStaticMarkup(
      <Select defaultValue="usd">
        <SelectTrigger aria-label="Currency">
          <SelectValue />
        </SelectTrigger>
      </Select>,
    );
    expect(html).toContain('aria-label="Currency"');
    expect(html).toContain('data-slot="select-trigger"');
  });

  it("keeps dropdown trigger semantics", () => {
    const html = renderToStaticMarkup(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">Menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(html).toContain('data-slot="dropdown-menu-trigger"');
    expect(html).toContain("Menu");
  });

  it("keeps separator role when decorative is false", () => {
    const html = renderToStaticMarkup(<Separator decorative={false} />);
    expect(html).toContain('role="separator"');
  });
});

