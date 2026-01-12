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
  Button,
  Chip,
  Grid,
} from "@mui/material";
import FloodIcon from "@mui/icons-material/Flood";

import { useQuery } from "@tanstack/react-query";
import {
  getFloodsNear,
  getLatestReadingForMeasure,
  getMeasuresForStation,
  getStationsNear,
} from "../../api/floodApi";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/StatusBlock";

function pickPreferredMeasure(measures) {
  const byLevel = measures.find((m) => (m.parameterName || "").toLowerCase().includes("level"));
  return byLevel || measures[0] || null;
}

export default function FloodTab({ location }) {
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedMeasureId, setSelectedMeasureId] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  const stationsQuery = useQuery({
    queryKey: ["flood-stations", location.postcode],
    queryFn: () => getStationsNear({ lat: location.lat, lng: location.lng, dist: 15000 }),
  });

  const stations = stationsQuery.data || [];

  const selectedStation = useMemo(() => {
    if (!selectedStationId) return null;
    return stations.find((s) => s.stationReference === selectedStationId) || null;
  }, [selectedStationId, stations]);

  const measuresQuery = useQuery({
    queryKey: ["flood-measures", selectedStationId],
    queryFn: () => getMeasuresForStation(selectedStationId),
    enabled: Boolean(selectedStationId),
  });

  const measures = measuresQuery.data || [];

  // Auto-pick a measure when measures arrive
  useMemo(() => {
    if (!selectedStationId) return;
    if (!measures.length) return;
    if (selectedMeasureId) return;
    const pref = pickPreferredMeasure(measures);
    if (pref?.notation) setSelectedMeasureId(pref.notation);
  }, [selectedStationId, measures, selectedMeasureId]);

  const readingQuery = useQuery({
    queryKey: ["flood-reading", selectedMeasureId],
    queryFn: () => getLatestReadingForMeasure(selectedMeasureId),
    enabled: Boolean(selectedMeasureId),
  });

  const alertsQuery = useQuery({
    queryKey: ["flood-alerts", location.postcode],
    queryFn: () => getFloodsNear({ lat: location.lat, lng: location.lng, dist: 15000 }),
    enabled: showAlerts,
  });

  return (
    <Stack spacing={2}>
      <Card>
        <CardHeader
          avatar={<FloodIcon />}
          title="Flood Monitoring"
          subheader="Environment Agency flood-monitoring API: stations, measures, readings, and alerts."
        />
        <Divider />
        <CardContent>
          {stationsQuery.isLoading && <LoadingBlock lines={5} />}
          {stationsQuery.isError && <ErrorBlock error={stationsQuery.error} />}

          {stationsQuery.isSuccess && stations.length === 0 && (
            <EmptyBlock title="No stations found nearby" body="Try a different postcode or increase the radius in code." />
          )}

          {stations.length > 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Station</InputLabel>
                  <Select
                    label="Station"
                    value={selectedStationId}
                    onChange={(e) => {
                      setSelectedStationId(e.target.value);
                      setSelectedMeasureId("");
                    }}
                  >
                    {stations.slice(0, 60).map((s) => (
                      <MenuItem key={s.stationReference} value={s.stationReference}>
                        {s.label} {s.riverName ? `• ${s.riverName}` : ""} {s.town ? `• ${s.town}` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedStation && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Station ref: <strong>{selectedStation.stationReference}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Town: {selectedStation.town ?? "—"} • River: {selectedStation.riverName ?? "—"}
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!measures.length}>
                  <InputLabel>Measure</InputLabel>
                  <Select
                    label="Measure"
                    value={selectedMeasureId}
                    onChange={(e) => setSelectedMeasureId(e.target.value)}
                  >
                    {measures.map((m) => (
                      <MenuItem key={m.notation} value={m.notation}>
                        {(m.parameterName || "Measure")} {m.unitName ? `(${m.unitName})` : ""} {m.qualifier ? `• ${m.qualifier}` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 2 }}>
                  {measuresQuery.isLoading && <LoadingBlock lines={3} />}
                  {measuresQuery.isError && <ErrorBlock error={measuresQuery.error} />}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Latest reading</Typography>
                  {readingQuery.isLoading && <LoadingBlock lines={2} />}
                  {readingQuery.isError && <ErrorBlock error={readingQuery.error} />}
                  {readingQuery.isSuccess && (
                    readingQuery.data ? (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }}>
                        <Chip label={`Value: ${readingQuery.data.value}`} />
                        <Chip label={`Time: ${readingQuery.data.dateTime}`} variant="outlined" />
                      </Stack>
                    ) : (
                      <EmptyBlock title="No latest reading" body="This measure may not have recent data." />
                    )
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Nearby alerts / warnings"
          subheader="Optional call to the floods endpoint."
          action={
            <Button
              variant={showAlerts ? "outlined" : "contained"}
              onClick={() => setShowAlerts((v) => !v)}
            >
              {showAlerts ? "Hide" : "Show"}
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {!showAlerts && (
            <Typography variant="body2" color="text.secondary">
              Click “Show” to fetch alerts near your postcode location.
            </Typography>
          )}

          {showAlerts && alertsQuery.isLoading && <LoadingBlock lines={4} />}
          {showAlerts && alertsQuery.isError && <ErrorBlock error={alertsQuery.error} />}

          {showAlerts && alertsQuery.isSuccess && (
            (alertsQuery.data?.length ?? 0) === 0 ? (
              <EmptyBlock title="No active alerts in this radius" body="That’s good news. Try another area to see results." />
            ) : (
              <Stack spacing={1}>
                {alertsQuery.data.slice(0, 20).map((f) => (
                  <Box key={f.floodAreaID} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="subtitle2">{f.severity ?? f.severityLevel ?? "Alert"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {f.description ?? f.message ?? "—"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
