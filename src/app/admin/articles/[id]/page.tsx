import { redirect } from "next/navigation";

export const runtime = "edge";

export default function AdminArticleEditPage() {
  redirect("/admin/articles");
}
