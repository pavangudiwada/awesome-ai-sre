import "server-only";

export function isOperatorEmail(
  email: string,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return (environment.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}
