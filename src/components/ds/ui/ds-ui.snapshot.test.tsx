import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds/ui/alert";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Input } from "@/components/ds/ui/input";
import { Label } from "@/components/ds/ui/label";
import { Separator } from "@/components/ds/ui/separator";
import { Skeleton } from "@/components/ds/ui/skeleton";
import { Checkbox } from "@/components/ds/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ds/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ds/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ds/ui/tooltip";

describe("DS UI snapshots", () => {
  it("button variants", () => {
    const html = renderToStaticMarkup(
      <div>
        <Button>Default</Button>
        <Button variant="success">Success</Button>
        <Button variant="warning">Warning</Button>
      </div>,
    );
    expect(html).toMatchSnapshot();
  });

  it("badge variants", () => {
    const html = renderToStaticMarkup(
      <div>
        <Badge>Default</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="critical">Critical</Badge>
      </div>,
    );
    expect(html).toMatchSnapshot();
  });

  it("card composition", () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(html).toMatchSnapshot();
  });

  it("input and label", () => {
    const html = renderToStaticMarkup(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="name@company.com" />
      </div>,
    );
    expect(html).toMatchSnapshot();
  });

  it("alert destructive", () => {
    const html = renderToStaticMarkup(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Action failed.</AlertDescription>
      </Alert>,
    );
    expect(html).toMatchSnapshot();
  });

  it("skeleton", () => {
    const html = renderToStaticMarkup(<Skeleton className="h-8 w-40" />);
    expect(html).toMatchSnapshot();
  });

  it("separator vertical", () => {
    const html = renderToStaticMarkup(<Separator orientation="vertical" />);
    expect(html).toMatchSnapshot();
  });

  it("dialog section primitives", () => {
    const html = renderToStaticMarkup(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description.</DialogDescription>
          </DialogHeader>
          <DialogFooter>Footer</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(html).toMatchSnapshot();
  });

  it("tooltip content", () => {
    const html = renderToStaticMarkup(
      <Tooltip open>
        <TooltipTrigger asChild>
          <span>anchor</span>
        </TooltipTrigger>
        <TooltipContent side="top">Tooltip text</TooltipContent>
      </Tooltip>,
    );
    expect(html).toMatchSnapshot();
  });

  it("checkbox checked", () => {
    const html = renderToStaticMarkup(
      <Checkbox checked aria-label="Accept terms" />,
    );
    expect(html).toMatchSnapshot();
  });

  it("tabs composition", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="details">Body</TabsContent>
      </Tabs>,
    );
    expect(html).toMatchSnapshot();
  });

  it("select composition", () => {
    const html = renderToStaticMarkup(
      <Select defaultValue="usd">
        <SelectTrigger aria-label="Currency">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="usd">USD</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(html).toMatchSnapshot();
  });

  it("dropdown trigger", () => {
    const html = renderToStaticMarkup(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">Open menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(html).toMatchSnapshot();
  });
});
