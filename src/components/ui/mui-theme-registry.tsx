"use client";

import { useState } from "react";
import { CacheProvider } from "@emotion/react";
import createCache, { type EmotionCache } from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

type MuiThemeRegistryProps = {
  children: React.ReactNode;
};

type CacheState = {
  cache: EmotionCache;
  flush: () => string[];
};

function createEmotionCacheState(): CacheState {
  const cache = createCache({ key: "mui" });
  cache.compat = true;

  const prevInsert = cache.insert;
  let inserted: string[] = [];
  cache.insert = (...args) => {
    const serialized = args[1];
    if (cache.inserted[serialized.name] === undefined) {
      inserted.push(serialized.name);
    }
    return prevInsert(...args);
  };

  const flush = () => {
    const prevInserted = inserted;
    inserted = [];
    return prevInserted;
  };

  return { cache, flush };
}

const theme = createTheme();

export default function MuiThemeRegistry({ children }: MuiThemeRegistryProps) {
  const [{ cache, flush }] = useState(createEmotionCacheState);

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }

    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

