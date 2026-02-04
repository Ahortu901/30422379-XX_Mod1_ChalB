
import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Grid,
  Drawer,
  Button,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";

import { useQuery } from "@tanstack/react-query";
import {
  getCrimeCategories,
  getCrimesAtLocation,
  getOutcomesForCrimePersistentId,
} from "../../api/policeApi";
import { formatYYYYMM } from "../../utils/format";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/StatusBlock";

export default function CrimeTab({ location }) {
  const [month, setMonth] = useState(
    formatYYYYMM(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  );
  const [category, setCategory] = useState("all-crime");
  const [selectedCrime, setSelectedCrime] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ["police-categories", month],
    queryFn: () => getCrimeCategories(month),
  });

  const crimesQuery = useQuery({
    queryKey: ["police-crimes", location.postcode, month, category],
    queryFn: () =>
      getCrimesAtLocation({
        lat: location.lat,
        lng: location.lng,
        dateYYYYMM: month,
        category,
      }),
    enabled: Boolean(location?.lat && location?.lng),
  });

  const persistentId = selectedCrime?.persistent_id || "";

  const outcomesQuery = useQuery({
    queryKey: ["police-outcomes", persistentId],
    queryFn: () => getOutcomesForCrimePersistentId(persistentId),
    enabled: Boolean(persistentId),
  });

  const summary = useMemo(() => {
    const list = crimesQuery.data || [];
    return {
      total: list.length,
      topStreet: list[0]?.location?.street?.name,
    };
  }, [crimesQuery.data]);

  return (
    <Stack spacing={2}>
      <Card>
        <CardHeader
          avatar={<GavelIcon />}
          title="Local Crime"
          subheader="UK Police Data API: categories, street-level crimes, outcomes (when persistent_id available)."
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Month</InputLabel>
                <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i - 1);
                    const v = formatYYYYMM(d);
                    return (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={8}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="all-crime">All crime</MenuItem>
                  {categoriesQuery.data?.map((c) => (
                    <MenuItem key={c.url} value={c.url}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                {categoriesQuery.isLoading && <LoadingBlock lines={2} />}
                {categoriesQuery.isError && <ErrorBlock error={categoriesQuery.error} />}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            {crimesQuery.isLoading && <LoadingBlock lines={6} />}
            {crimesQuery.isError && <ErrorBlock error={crimesQuery.error} />}

            {crimesQuery.isSuccess &&
              ((crimesQuery.data?.length ?? 0) === 0 ? (
                <EmptyBlock title="No crimes returned" body="Try a different month or category." />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total: <strong>{summary.total}</strong>
                    {summary.topStreet ? ` • Example street: ${summary.topStreet}` : ""}
                  </Typography>

                  <Stack spacing={1}>
                    {crimesQuery.data.slice(0, 25).map((c) => (
                      <Box
                        key={c.id}
                        onClick={() => setSelectedCrime(c)}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Typography variant="subtitle2">
                          {c.category?.replaceAll("-", " ") ?? "Crime"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {c.location?.street?.name ?? "—"} • {c.month}
                          {c.persistent_id ? " • outcomes available" : " • outcomes N/A"}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              ))}
          </Box>
        </CardContent>
      </Card>

      <Drawer anchor="right" open={Boolean(selectedCrime)} onClose={() => setSelectedCrime(null)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Crime details
            </Typography>

            {selectedCrime && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Category: <strong>{selectedCrime.category}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Month: <strong>{selectedCrime.month}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Street: <strong>{selectedCrime.location?.street?.name ?? "—"}</strong>
                </Typography>
              </>
            )}

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2">Outcomes</Typography>

            {selectedCrime && !selectedCrime.persistent_id && (
              <EmptyBlock
                title="Outcomes not available"
                body="This record does not include a persistent_id, so the outcomes endpoint cannot be used."
              />
            )}

            {selectedCrime?.persistent_id && outcomesQuery.isLoading && <LoadingBlock lines={4} />}
            {selectedCrime?.persistent_id && outcomesQuery.isError && <ErrorBlock error={outcomesQuery.error} />}

            {selectedCrime?.persistent_id && outcomesQuery.isSuccess && (
              outcomesQuery.data?.outcomes?.length ? (
                <Stack spacing={1}>
                  {outcomesQuery.data.outcomes.slice(0, 10).map((o, idx) => (
                    <Box
                      key={idx}
                      sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                    >
                      <Typography variant="body2">
                        {o.category?.name ?? o.category ?? "Outcome"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.date ?? "—"}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyBlock title="No outcomes returned" body="The API returned no outcomes for this persistent_id." />
              )
            )}

            <Button variant="outlined" onClick={() => setSelectedCrime(null)} sx={{ mt: 2 }}>
              Close
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  );
}
