import { DashboardClient } from "@/app/dashboard-client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName ?? user?.firstName ?? email ?? "Protos member";

  return <DashboardClient user={{ name, email }} />;
}
