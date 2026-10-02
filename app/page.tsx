import { DashboardClient } from "@/app/dashboard-client";

export default function Home() {
  return <DashboardClient user={{ name: "Akib", email: "" }} />;
}
