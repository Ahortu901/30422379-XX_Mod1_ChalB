import React from "react";
import { Alert, Box } from "@mui/material";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">
            <strong>Something crashed in this tab.</strong>
            <div style={{ marginTop: 8 }}>
              {this.state.error?.message || String(this.state.error)}
            </div>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
