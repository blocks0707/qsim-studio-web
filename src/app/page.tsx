import { IDELayout } from "@/components/ide/IDELayout";
import { AuthGuard } from "@/components/ide/AuthGuard";

export default function Home() {
  return (
    <AuthGuard>
      <IDELayout />
    </AuthGuard>
  );
}
