import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
  Grid,
  Button,
  Chip,
  TextField,
} from "@mui/material";
import WaterIcon from "@mui/icons-material/Water";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useQuery } from "@tanstack/react-query";
import { listBathingWaters, getBathingWaterDetail } from "../../api/bathingWaterApi";
import { haversineKm } from "../../utils/geo";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/StatusBlock";

function pickLabel(x) {
  return (
    x?.label ||
    x?.name ||
    x?.title ||
    x?.["rdfs:label"] ||
    x?.["dc:title"] ||
    x?.["dct:title"] ||
    "Bathing water"
  );
}

function getAboutUrl(x) {
  // be VERY tolerant: the EA LD endpoints vary a lot
  return (
    x?._about ||
    x?.about ||
    x?.["@id"] ||
    x?.id ||
    x?.uri ||
    x?.url ||
    null
  );
}

function asNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractLatLngFromItem(item) {
  const lat =
    asNumber(item?.lat) ??
    asNumber(item?.latitude) ??
    asNumber(item?.geo?.lat) ??
    asNumber(item?.geo?.latitude);

  const lng =
    asNumber(item?.long) ??
    asNumber(item?.lng) ??
    asNumber(item?.longitude) ??
    asNumber(item?.geo?.long) ??
    asNumber(item?.geo?.lng) ??
    asNumber(item?.geo?.longitude);

  if (lat != null && lng != null) return { lat, lng };
  return null;
}

function extractMetaFromListItem(item) {
  const about = getAboutUrl(item);
  const label = pickLabel(item);

  const district =
    item?.localAuthorityName ||
    item?.district ||
    item?.region ||
    item?.["ea:localAuthorityName"] ||
    null;

  const ll = extractLatLngFromItem(item);

  return { about, label, district, latLng: ll, raw: item };
}

function prettyValue(v) {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function extractDetailSummary(detailJson) {
  // Handle common EA response shapes without assuming too much
  const items = detailJson?.items ?? detailJson?.result?.items;
  const root = Array.isArray(items) ? items[0] : (detailJson?.result ?? detailJson);

  const label = pickLabel(root);
  const about = getAboutUrl(root);
  const latLng = extractLatLngFromItem(root);

  const authority =
    root?.localAuthorityName ||
    root?.localAuthority ||
    root?.district ||
    root?.adminDistrict ||
    null;

  const classification =
    root?.latestClassification ||
    root?.classification ||
    root?.overallClassification ||
    null;

  const extra = {
    "Local authority": authority,
    "Classification": classification,
    "Latitude": latLng?.lat,
    "Longitude": latLng?.lng,
  };

  Object.keys(extra).forEach((k) => {
    if (extra[k] == null) delete extra[k];
  });

  return { label, about, extra, root };
}

export default function WaterTab({ location }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");

  const listQuery = useQuery({
    queryKey: ["bwq-list"],
    queryFn: listBathingWaters,
  });

  // Always safe mapping
  const listItems = useMemo(() => {
    const arr = Array.isArray(listQuery.data) ? listQuery.data : [];
    return arr.map(extractMetaFromListItem);
  }, [listQuery.data]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = listItems;

    const withDist = base
      .map((x) => {
        const ll = x.latLng;
        const km = ll ? haversineKm(location.lat, location.lng, ll.lat, ll.lng) : null;
        return { ...x, km };
      })
      .sort((a, b) => (a.km ?? 999999) - (b.km ?? 999999));

    const qFiltered = q
      ? withDist.filter((x) => (x.label || "").toLowerCase().includes(q))
      : withDist;

    return qFiltered.slice(0, 30);
  }, [filter, listItems, location.lat, location.lng]);

  const detailQuery = useQuery({
    queryKey: ["bwq-detail", selected?.about],
    queryFn: () => getBathingWaterDetail(selected.about),
    enabled: Boolean(selected?.about),
  });

  const detail = useMemo(() => {
    if (!detailQuery.data) return null;
    return extractDetailSummary(detailQuery.data);
  }, [detailQuery.data]);

  return (
    <Stack spacing={2}>
      <Card>
        <CardHeader
          avatar={<WaterIcon />}
          title="Water Quality (Bathing Water)"
          subheader="Environment Agency bathing-water API: list and detail (robust rendering)."
        />
        <Divider />
        <CardContent>
          {listQuery.isLoading && <LoadingBlock lines={5} />}
          {listQuery.isError && <ErrorBlock error={listQuery.error} />}

          {listQuery.isSuccess && listItems.length === 0 && (
            <EmptyBlock
              title="No bathing waters returned"
              body="Either the API returned an empty list, or the response shape changed. Check /ea/doc/bathing-water.json loads."
            />
          )}

          {listQuery.isSuccess && listItems.length > 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Find a bathing water</Typography>
                  <TextField
                    size="small"
                    label="Filter by name"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="e.g. Brighton, Blackpool..."
                  />
                  <Typography variant="caption" color="text.secondary">
                    Showing up to 30 results (closest first when coordinates exist).
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  {filtered.map((x) => (
                    <Box
                      key={x.about || x.label}
                      onClick={() => x.about && setSelected(x)}
                      sx={{
                        p: 1.5,
                        border: "1px solid",
                        borderColor: selected?.about === x.about ? "primary.main" : "divider",
                        borderRadius: 2,
                        cursor: x.about ? "pointer" : "not-allowed",
                        opacity: x.about ? 1 : 0.55,
                        "&:hover": { bgcolor: x.about ? "action.hover" : "transparent" },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, flexGrow: 1 }}>
                          {x.label}
                        </Typography>
                        {x.km != null && <Chip size="small" label={`${x.km.toFixed(1)} km`} />}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {x.district ?? "—"}
                      </Typography>

                      {!x.about && (
                        <Typography variant="caption" color="text.secondary">
                          Details unavailable (no ID in list item)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Details
                </Typography>

                {!selected && (
                  <EmptyBlock title="Select a bathing water" body="Click an item on the left to load details." />
                )}

                {selected && (
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      backdropFilter: "blur(10px)",
                      backgroundColor: "rgba(255,255,255,0.70)",
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                          {selected.label}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                          <Chip size="small" label="EA Bathing Water" variant="outlined" />
                          {selected.km != null && <Chip size="small" label={`${selected.km.toFixed(1)} km away`} />}
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                          {selected.about || "—"}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        {!selected.about && (
                          <EmptyBlock
                            title="No detail URL"
                            body="This entry has no about/_about/@id, so details can’t be fetched."
                          />
                        )}

                        {selected.about && detailQuery.isLoading && <LoadingBlock lines={6} />}
                        {selected.about && detailQuery.isError && (
                          <>
                            <ErrorBlock error={detailQuery.error} />
                            <Typography variant="caption" color="text.secondary">
                              If you’re on Vite dev server, open <strong>/ea/doc/bathing-water.json</strong>.
                              If it doesn’t load, your proxy isn’t active.
                            </Typography>
                          </>
                        )}

                        {selected.about && detailQuery.isSuccess && detail && (
                          <>
                            <Typography variant="subtitle2">Summary</Typography>

                            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                              {Object.keys(detail.extra).length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  No standard fields found in this response shape.
                                </Typography>
                              ) : (
                                <Stack spacing={0.75}>
                                  {Object.entries(detail.extra).map(([k, v]) => (
                                    <Stack key={k} direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 140 }}>
                                        {k}:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {prettyValue(v)}
                                      </Typography>
                                    </Stack>
                                  ))}
                                </Stack>
                              )}
                            </Box>

                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                              <Button
                                size="small"
                                variant="contained"
                                endIcon={<OpenInNewIcon />}
                                onClick={() => window.open(selected.about, "_blank")}
                              >
                                Open official page
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  const blob = new Blob([JSON.stringify(detailQuery.data, null, 2)], {
                                    type: "application/json",
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = "bathing-water-detail.json";
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                Download evidence (JSON)
                              </Button>
                            </Stack>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
