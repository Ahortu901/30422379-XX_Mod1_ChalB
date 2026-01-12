import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function PostcodeDialog({ open, onClose, onSubmit, defaultValue = "" }) {
  const [postcode, setPostcode] = useState(defaultValue);
  const canSubmit = useMemo(() => postcode.trim().length >= 5, [postcode]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Set your postcode</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            We use this to find nearby flood stations, bathing waters, and street-level crime.
          </Typography>
          <TextField
            label="Postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="e.g. SW1A 1AA"
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(postcode)}
          disabled={!canSubmit}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
