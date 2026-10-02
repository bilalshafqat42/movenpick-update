import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_TOKEN_COOKIE } from "@/lib/preview-mode";

// Linked from the preview banner (see src/app/layout.js) — the only way
// out of draft mode short of the cookie expiring on its own after an hour.
export async function GET() {
  const draft = await draftMode();
  draft.disable();

  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_TOKEN_COOKIE);

  redirect("/");
}
