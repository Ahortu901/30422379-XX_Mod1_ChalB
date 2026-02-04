
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Grid,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";

import { useQuery, useQueries } from "@tanstack/react-query";
import {
  listDatasets,
  getDataset,
  getLatestVersionHref,
  getVersionByHref,
  getDimensions,
  getDimensionOptions,
  getObservations,
} from "../../api/onsApi";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/StatusBlock";

function safeJsonDownload(data, filename = "ons-observations.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderObservationValue(o) {
  if (o == null) return "—";
  if (typeof o === "string" || typeof o === "number") return String(o);
  if (o.observation != null) return String(o.observation);
  if (o.value != null) return String(o.value);
  // fallback: first primitive field
  const first = Object.values(o).find((v) => typeof v === "string" || typeof v === "number");
  return first != null ? String(first) : "—";
}

function renderMetadataEntries(o) {
  const md = o?.metadata;
  if (!md || typeof md !== "object") return null;
  const entries = Object.entries(md).filter(([, v]) => v != null);
  return entries.length ? entries : null;
}

export default function OnsTab({ location }) {
  const [search, setSearch] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [selectedOptions, setSelectedOptions] = useState({}); 

  const datasetsQuery = useQuery({
    queryKey: ["ons-datasets"],
    queryFn: listDatasets,
  });

  const filteredDatasets = useMemo(() => {
    const items = datasetsQuery.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 60);
    return items
      .filter((d) => (d.title || d.id || "").toLowerCase().includes(q))
      .slice(0, 60);
  }, [datasetsQuery.data, search]);

  const datasetQuery = useQuery({
    queryKey: ["ons-dataset", datasetId],
    queryFn: () => getDataset(datasetId),
    enabled: Boolean(datasetId),
  });

  const latestHref = useMemo(
    () => getLatestVersionHref(datasetQuery.data),
    [datasetQuery.data]
  );

  const versionQuery = useQuery({
    queryKey: ["ons-latest-version", latestHref],
    queryFn: () => getVersionByHref(latestHref),
    enabled: Boolean(latestHref),
  });

  const versionParts = useMemo(() => {
    const v = versionQuery.data;
    const href = v?.links?.self?.href;
    if (!href) return null;
    const m = href.match(/datasets\/([^/]+)\/editions\/([^/]+)\/versions\/([^/]+)/);
    if (!m) return null;
    return { datasetId: m[1], edition: m[2], version: m[3] };
  }, [versionQuery.data]);

  const dimsQuery = useQuery({
    queryKey: ["ons-dimensions", versionParts?.datasetId, versionParts?.edition, versionParts?.version],
    queryFn: () => getDimensions(versionParts),
    enabled: Boolean(versionParts),
  });

  const dims = dimsQuery.data || [];

  
  useEffect(() => {
    setSelectedOptions({});
  }, [datasetId]);

  
  const optionsQueries = useQueries({
    queries: (dims || []).map((d) => ({
      queryKey: ["ons-options", versionParts?.datasetId, versionParts?.edition, versionParts?.version, d.name],
      queryFn: () =>
        getDimensionOptions({
          ...versionParts,
          dimension: d.name,
          limit: 50,
          offset: 0,
        }),
      enabled: Boolean(versionParts && d?.name),
      staleTime: 5 * 60_000,
    })),
  });

  const isAnyOptionsLoading = useMemo(
    () => optionsQueries.some((q) => q.isLoading),
    [optionsQueries]
  );
  const optionsError = useMemo(
    () => optionsQueries.find((q) => q.isError)?.error,
    [optionsQueries]
  );

  
  useEffect(() => {
    if (!dims.length) return;
    let changed = false;
    const next = { ...selectedOptions };

    dims.forEach((d, idx) => {
      const opts = optionsQueries[idx]?.data;
      if (!opts?.length) return;
      if (!next[d.name]) {
        next[d.name] = opts[0].option;
        changed = true;
      }
    });

    if (changed) setSelectedOptions(next);
  
  }, [dims, optionsQueries.map((q) => (q.data ? q.data.length : 0)).join("|")]);

  const allDimsSelected = useMemo(() => {
    if (!dims.length) return false;
    return dims.every((d) => Boolean(selectedOptions[d.name]));
  }, [dims, selectedOptions]);

  const observationsQuery = useQuery({
    queryKey: [
      "ons-observations",
      versionParts?.datasetId,
      versionParts?.edition,
      versionParts?.version,
      JSON.stringify(selectedOptions),
    ],
    queryFn: () => getObservations({ ...versionParts, selections: selectedOptions }),
    enabled: Boolean(versionParts && allDimsSelected),
  });

  return (
    <Stack spacing={2}>
      <Card>
        <CardHeader
          avatar={<InsightsIcon />}
          title="ONS Stats"
          subheader="Browse datasets, select required dimensions, and view values as readable data."
        />
        <Divider />
        <CardContent>
          {datasetsQuery.isLoading && <LoadingBlock lines={6} />}
          {datasetsQuery.isError && <ErrorBlock error={datasetsQuery.error} />}

          {datasetsQuery.isSuccess && (
            <Stack spacing={2}>
              <TextField
                label="Search datasets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try: population, CPI, employment..."
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Dataset</InputLabel>
                <Select
                  label="Dataset"
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                >
                  {filteredDatasets.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.title ?? d.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {datasetId && datasetQuery.isLoading && <LoadingBlock lines={2} />}
              {datasetId && datasetQuery.isError && <ErrorBlock error={datasetQuery.error} />}

              {datasetId && versionQuery.isLoading && <LoadingBlock lines={2} />}
              {datasetId && versionQuery.isError && <ErrorBlock error={versionQuery.error} />}

              {datasetId && dimsQuery.isLoading && <LoadingBlock lines={2} />}
              {datasetId && dimsQuery.isError && <ErrorBlock error={dimsQuery.error} />}

              {datasetId && dims.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Dimensions (choose an option for each)
                  </Typography>

                  {isAnyOptionsLoading && <LoadingBlock lines={3} />}
                  {optionsError && <ErrorBlock error={optionsError} />}

                  <Grid container spacing={2}>
                    {dims.map((d, idx) => {
                      const opts = optionsQueries[idx]?.data || [];
                      return (
                        <Grid key={d.name} item xs={12} md={6}>
                          <FormControl fullWidth disabled={!opts.length}>
                            <InputLabel>{d.name}</InputLabel>
                            <Select
                              label={d.name}
                              value={selectedOptions[d.name] || ""}
                              onChange={(e) =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [d.name]: e.target.value,
                                }))
                              }
                            >
                              {opts.map((o) => (
                                <MenuItem key={o.option} value={o.option}>
                                  {o.label ?? o.option}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Results</Typography>

                    {!allDimsSelected && (
                      <EmptyBlock
                        title="Waiting for selections"
                        body="Choose an option for every dimension to request observations."
                      />
                    )}

                    {allDimsSelected && observationsQuery.isLoading && <LoadingBlock lines={6} />}
                    {allDimsSelected && observationsQuery.isError && <ErrorBlock error={observationsQuery.error} />}

                    {allDimsSelected && observationsQuery.isSuccess && (
                      Array.isArray(observationsQuery.data) ? (
                        observationsQuery.data.length === 0 ? (
                          <EmptyBlock title="No observations returned" body="Try different options/dataset." />
                        ) : (
                          <Stack spacing={2} sx={{ mt: 1 }}>
                            {/* KPI for first observation */}
                            <Box
                              sx={{
                                p: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                backdropFilter: "blur(10px)",
                                backgroundColor: "rgba(255,255,255,0.70)",
                              }}
                            >
                              <Typography variant="overline" color="text.secondary">
                                Primary value
                              </Typography>
                              <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                                {renderObservationValue(observationsQuery.data[0])}
                              </Typography>

                              {renderMetadataEntries(observationsQuery.data[0]) && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                                  {renderMetadataEntries(observationsQuery.data[0]).map(([k, v]) => (
                                    <Box
                                      key={k}
                                      sx={{
                                        px: 1.25,
                                        py: 0.5,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 999,
                                        bgcolor: "rgba(255,255,255,0.6)",
                                        backdropFilter: "blur(8px)",
                                      }}
                                    >
                                      <Typography variant="caption" color="text.secondary">
                                        {k}: <strong>{String(v)}</strong>
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Box>

                            {/* List up to 20 observations */}
                            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Observations ({observationsQuery.data.length})
                              </Typography>

                              <Stack spacing={1}>
                                {observationsQuery.data.slice(0, 20).map((o, idx) => (
                                  <Box
                                    key={idx}
                                    sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                                  >
                                    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ flexWrap: "wrap" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                        {renderObservationValue(o)}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        #{idx + 1}
                                      </Typography>
                                    </Stack>

                                    {renderMetadataEntries(o) && (
                                      <Typography variant="caption" color="text.secondary">
                                        {renderMetadataEntries(o)
                                          .slice(0, 6)
                                          .map(([k, v]) => `${k}:${v}`)
                                          .join(" • ")}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Stack>

                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ mt: 1 }}
                                onClick={() => safeJsonDownload(observationsQuery.data)}
                              >
                                Download evidence (JSON)
                              </Button>
                            </Box>
                          </Stack>
                        )
                      ) : (
                        <EmptyBlock
                          title="Unexpected response"
                          body="This dataset returned a non-array observation shape. Try another dataset."
                        />
                      )
                    )}
                  </Box>
                </>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Location note"
          subheader="ONS tab doesn’t require your postcode, but your postcode is used for other tabs."
        />
        <Divider />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Your postcode location is currently: <strong>{location.postcode}</strong> (
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)})
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
