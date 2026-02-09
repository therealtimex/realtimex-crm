import { Create } from "@/components/ds/admin/create";
import { SimpleForm } from "@/components/ds/admin/simple-form";

import { InvoiceInputs } from "./InvoiceInputs";

export const InvoiceCreate = () => {
  return (
    <Create redirect="show">
      <SimpleForm className="max-w-full">
        <InvoiceInputs />
      </SimpleForm>
    </Create>
  );
};
