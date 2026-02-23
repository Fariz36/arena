import Button from "@mui/material/Button";
import { signOutAction } from "@/features/auth/actions";

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outlined" size="small">
        Sign out
      </Button>
    </form>
  );
}
