// src/features/water/WaterTab.jsx  (FULL - friendly list + clean labels)
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
import PlaceIcon from "@mui/icons-material/Place";

import { useQuery } from "@tanstack/react-query";
import { listBathingWaters, getBathingWaterDetail } from "../../api/bathingWaterApi";
import { haversineKm } from "../../utils/geo";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/StatusBlock";

/**
 * Friendly rendering helpers for EA linked-data values.
 * EA often returns objects like: { _value: "...", _lang: "en" }
 */
function toText(v) {
  if (v == null) return "";

  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(", ");

  if (typeof v === "object") {
    if ("_value" in v) return String(v._value);
    if ("@value" in v) return String(v["@value"]);
    if ("value" in v) return String(v.value);

    // Some LD objects: { name: { _value: "Northumberland" }, _about: "..." }
    if ("name" in v) return toText(v.name);

    // Some: { label: "X" }
    if ("label" in v && typeof v.label === "string") return v.label;

    // Do NOT stringify objects in the UI list (too noisy)
    return "";
  }

  return String(v);
}

function pickLabel(x) {
  const raw =
    x?.label ||
    x?.name ||
    x?.title ||
    x?.["rdfs:label"] ||
    x?.["dc:title"] ||
    x?.["dct:title"] ||
    "Bathing water";
  const t = toText(raw);
  return t || "Bathing water";
}

function getAboutUrl(x) {
  return x?._about || x?.about || x?.["@id"] || x?.id || x?.uri || x?.url || null;
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

// Try to extract a nice authority/region name from the list item
function extractAuthority(item) {
  // common keys we’ve seen
  const raw =
    item?.localAuthorityName ||
    item?.district ||
    item?.region ||
    item?.["ea:localAuthorityName"] ||
    item?.localAuthority ||
    null;

  // some shapes: { localAuthority: { name: { _value: "Northumberland" } } }
  const nested = item?.localAuthority?.name || item?.district?.name || item?.region?.name;

  return toText(raw) || toText(nested) || "";
}

function extractMetaFromListItem(item) {
  const about = getAboutUrl(item);
  const label = pickLabel(item);
  const authority = extractAuthority(item);
  const ll = extractLatLngFromItem(item);

  return { about, label, authority, latLng: ll, raw: item };
}

function extractDetailSummary(detailJson) {
  const items = detailJson?.items ?? detailJson?.result?.items;
  const root = Array.isArray(items) ? items[0] : (detailJson?.result ?? detailJson);

  const label = pickLabel(root);
  const about = getAboutUrl(root);
  const latLng = extractLatLngFromItem(root);

  const authority =
    toText(root?.localAuthorityName) ||
    toText(root?.localAuthority?.name) ||
    toText(root?.district) ||
    toText(root?.district?.name) ||
    "";

  const classification =
    toText(root?.latestClassification) ||
    toText(root?.classification) ||
    toText(root?.overallClassification) ||
    "";

  const waterType =
    toText(root?.waterType) ||
    toText(root?.bathingWaterType) ||
    toText(root?.type) ||
    "";

  const extra = [
    authority ? { k: "Local authority", v: authority } : null,
    waterType ? { k: "Water type", v: waterType } : null,
    classification ? { k: "Classification", v: classification } : null,
    latLng ? { k: "Coordinates", v: `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}` } : null,
  ].filter(Boolean);

  return { label, about, extra, root };
}

export default function WaterTab({ location }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");

  const listQuery = useQuery({
    queryKey: ["bwq-list"],
    queryFn: listBathingWaters,
  });

  const listItems = useMemo(() => {
    const arr = Array.isArray(listQuery.data) ? listQuery.data : [];
    return arr.map(extractMetaFromListItem);
  }, [listQuery.data]);

  const results = useMemo(() => {
    const q = filter.trim().toLowerCase();

    // add distance (if possible)
    const withDist = listItems
      .map((x) => {
        const ll = x.latLng;
        const km = ll ? haversineKm(location.lat, location.lng, ll.lat, ll.lng) : null;
        return { ...x, km };
      })
      .sort((a, b) => (a.km ?? 999999) - (b.km ?? 999999));

    const filtered = q
      ? withDist.filter((x) => x.label.toLowerCase().includes(q) || x.authority.toLowerCase().includes(q))
      : withDist;

    return filtered.slice(0, 30);
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
          subheader="Find bathing waters by name or authority; view friendly details."
        />
        <Divider />
        <CardContent>
          {listQuery.isLoading && <LoadingBlock lines={5} />}
          {listQuery.isError && <ErrorBlock error={listQuery.error} />}

          {listQuery.isSuccess && listItems.length === 0 && (
            <EmptyBlock title="No bathing waters returned" body="Check /ea/doc/bathing-water.json loads." />
          )}

          {listQuery.isSuccess && listItems.length > 0 && (
            <Grid container spacing={2}>
              {/* LEFT: list */}
              <Grid item xs={12} md={6}>
                <Stack spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Find a bathing water</Typography>
                  <TextField
                    size="small"
                    label="Search by name or authority"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="e.g. Bamburgh, Northumberland..."
                  />
                  <Typography variant="caption" color="text.secondary">
                    Showing up to 30 results (closest first when coordinates are available).
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  {results.map((x) => (
                    <Box
                      key={x.about || x.label}
                      onClick={() => x.about && setSelected(x)}
                      sx={{
                        p: 1.5,
                        border: "1px solid",
                        borderColor: selected?.about === x.about ? "primary.main" : "divider",
                        borderRadius: 2,
                        cursor: x.about ? "pointer" : "not-allowed",
                        opacity: x.about ? 1 : 0.6,
                        "&:hover": { bgcolor: x.about ? "action.hover" : "transparent" },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
                          {x.label}
                        </Typography>
                        {x.km != null && <Chip size="small" label={`${x.km.toFixed(1)} km`} />}
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <PlaceIcon fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          {x.authority || "Authority not listed"}
                        </Typography>
                      </Stack>

                      {!x.about && (
                        <Typography variant="caption" color="text.secondary">
                          Details unavailable (no ID)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Grid>

              {/* RIGHT: details */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Details
                </Typography>

                {!selected && (
                  <EmptyBlock title="Select a bathing water" body="Click a result on the left to load details." />
                )}

                {selected && (
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      backdropFilter: "blur(10px)",
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          {selected.label}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                          <Chip size="small" label="EA Bathing Water" variant="outlined" />
                          {selected.km != null && <Chip size="small" label={`${selected.km.toFixed(1)} km away`} />}
                          {selected.authority && <Chip size="small" label={selected.authority} variant="outlined" />}
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        {!selected.about && (
                          <EmptyBlock title="No detail URL" body="This entry has no linked ID to fetch details." />
                        )}

                        {selected.about && detailQuery.isLoading && <LoadingBlock lines={6} />}
                        {selected.about && detailQuery.isError && <ErrorBlock error={detailQuery.error} />}

                        {selected.about && detailQuery.isSuccess && detail && (
                          <>
                            <Typography variant="subtitle2">Summary</Typography>

                            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                              {detail.extra.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  No standard fields found for this resource.
                                </Typography>
                              ) : (
                                <Stack spacing={0.75}>
                                  {detail.extra.map(({ k, v }) => (
                                    <Stack key={k} direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 140 }}>
                                        {k}:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {v}
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
                            </Stack>

                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                              Tip: use the search box to find sites by council/authority name.
                            </Typography>
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
