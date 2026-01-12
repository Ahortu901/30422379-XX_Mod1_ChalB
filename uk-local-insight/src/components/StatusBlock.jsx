import { Alert, Box, Skeleton, Stack } from "@mui/material";

export function LoadingBlock({ lines = 3 }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={24} />
      ))}
    </Stack>
  );
}

export function ErrorBlock({ error }) {
  if (!error) return null;
  return (
    <Alert severity="error">
      {typeof error === "string" ? error : error.message || "Something went wrong."}
    </Alert>
  );
}

export function EmptyBlock({ title = "Nothing to show yet", body = "Try changing your filters." }) {
  return (
    <Box>
      <Alert severity="info">
        <strong>{title}</strong>
        <div>{body}</div>
      </Alert>
    </Box>
  );
}
