import type { RAFile } from "../../../types";
import { supabase } from "../supabase";

/**
 * Uploads a file to the Supabase "attachments" storage bucket.
 *
 * Idempotent: if the file already exists in the bucket (non-blob/data URL with a valid
 * signed URL), the upload is skipped and the existing src/path are preserved.
 *
 * Side-effect: mutates `fi.path`, `fi.src`, and `fi.type` in place (and also returns `fi`).
 */
export const uploadToBucket = async (fi: RAFile): Promise<RAFile | undefined> => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    // Sign URL check if path exists in the bucket
    if (fi.path) {
      const { error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fi.path, 60);

      if (!error) {
        return;
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src).then((res) => res.blob())
    : fi.rawFile;

  const file = fi.rawFile;
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  // save MIME type
  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
