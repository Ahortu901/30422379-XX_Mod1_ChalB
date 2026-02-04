
import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Stack,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useQuery } from "@tanstack/react-query";
import { lookupPostcode } from "../api/postcodeApi";

import PostcodeDialog from "./PostcodeDialog";
import LiveBackground from "./LiveBackground";
import { ErrorBlock, LoadingBlock } from "./StatusBlock";

import FloodTab from "../features/flood/FloodTab";
import WaterTab from "../features/water/WaterTab";
import CrimeTab from "../features/crime/CrimeTab";
import OnsTab from "../features/ons/OnsTab";

import ErrorBoundary from "./ErrorBoundary";

function getTabFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return p.get("tab") || "flood";
}

function getPostcodeFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return (p.get("postcode") || "").trim();
}

function setUrlState({ tab, postcode }) {
  const p = new URLSearchParams(window.location.search);
  if (tab) p.set("tab", tab);
  if (postcode) p.set("postcode", postcode);
  const next = `${window.location.pathname}?${p.toString()}`;
  window.history.replaceState(null, "", next);
}

const TAB_ORDER = ["flood", "water", "crime", "ons"];
const TAB_LABELS = ["Flood", "Water", "Crime", "ONS Stats"];

export default function AppShell() {
  const saved = (localStorage.getItem("uli_postcode") || "").trim();
  const urlPostcode = getPostcodeFromUrl();
  const initialPostcode = (urlPostcode || saved).trim();

  const [postcode, setPostcode] = useState(initialPostcode);
  const [tab, setTab] = useState(getTabFromUrl());
  const [dialogOpen, setDialogOpen] = useState(!initialPostcode);

  // Keep URL in sync (shareable links)
  useEffect(() => {
    setUrlState({ tab, postcode });
  }, [tab, postcode]);

  // Location lookup (postcode -> lat/lng)
  const locationQuery = useQuery({
    queryKey: ["postcode", postcode],
    queryFn: () => lookupPostcode(postcode),
    enabled: Boolean(postcode),
  });

  const location = locationQuery.data;

  const tabIndex = useMemo(() => {
    const idx = TAB_ORDER.indexOf(tab);
    return idx >= 0 ? idx : 0;
  }, [tab]);

  const headerChipLabel = useMemo(() => {
    if (!postcode) return "No postcode set";
    if (!location) return postcode;
    const area = location.district || location.region || "";
    return area ? `${location.postcode} • ${area}` : location.postcode;
  }, [postcode, location]);

  function handleTabChange(_, idx) {
    setTab(TAB_ORDER[idx] || "flood");
  }

  function handlePostcodeSubmit(pc) {
    const cleaned = pc.trim();
    localStorage.setItem("uli_postcode", cleaned);
    setPostcode(cleaned);
    setDialogOpen(false);
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "transparent",
      }}
    >
      {/* Live animated background */}
      <LiveBackground />

      <AppBar
        position="sticky"
        elevation={0}
        color="default"
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255,255,255,0.75)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
            UK Local Insight
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip icon={<LocationOnIcon />} label={headerChipLabel} variant="outlined" />
            <Button
              startIcon={<SwapHorizIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{ whiteSpace: "nowrap" }}
            >
              Change
            </Button>
          </Stack>
        </Toolbar>

        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            "& .MuiTab-root": { fontWeight: 700 },
          }}
        >
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </AppBar>

      <Container sx={{ py: 3 }}>
        {!postcode && (
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Set postcode to begin
          </Button>
        )}

        {postcode && locationQuery.isLoading && <LoadingBlock lines={4} />}
        {postcode && locationQuery.isError && <ErrorBlock error={locationQuery.error} />}

        {location && (
          <Box sx={{ mt: 2 }}>
            {tab === "flood" && <FloodTab location={location} />}
            {tab === "water" && (
  <ErrorBoundary>
    <WaterTab location={location} />
  </ErrorBoundary>
)}

            {tab === "crime" && <CrimeTab location={location} />}
            {tab === "ons" && <OnsTab location={location} />}
          </Box>
        )}
      </Container>

      <PostcodeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handlePostcodeSubmit}
        defaultValue={postcode}
      />
    </Box>
  );
}
