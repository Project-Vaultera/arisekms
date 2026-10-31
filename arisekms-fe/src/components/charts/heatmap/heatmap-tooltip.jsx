"use client";;
import { memo, useMemo } from "react";
import { resolveTooltipBoxMotion } from "../chart-config-context";
import { TooltipBox } from "../tooltip/tooltip-box";
import { TooltipHeader } from "../tooltip/tooltip-content";
import {
  TOOLTIP_HIDE_DELAY_MS,
  useDelayedTooltipData,
} from "../tooltip/use-delayed-tooltip-data";
import { useHeatmap, useHeatmapInteraction } from "./heatmap-context";
import {
  formatHeatmapContributionLabel,
  formatHeatmapTooltipDate,
  formatHeatmapTooltipWeekday,
} from "./heatmap-utils";

export const HeatmapTooltip = memo(function HeatmapTooltip({
  formatLabel = formatHeatmapContributionLabel,
  className = "",
  panelStyle,
  backgroundColor,
  showDelay = 0,
  hideDelay = TOOLTIP_HIDE_DELAY_MS,
  instant = false,
  damping,
  springConfig
}) {
  const { containerRef, width, height } = useHeatmap();
  const { tooltipData } = useHeatmapInteraction();
  const displayData = useDelayedTooltipData(tooltipData, showDelay, hideDelay);

  // Same follow spring as `ChartTooltip`'s panel. Without `damping` /
  // `springConfig`, `TooltipBox` falls back to `ChartConfigProvider`'s
  // `tooltipBoxSpring`.
  const boxMotion = useMemo(() => {
    if (springConfig) {
      return { animate: true, springConfig };
    }
    if (damping === undefined) {
      return { animate: true, springConfig: undefined };
    }
    return resolveTooltipBoxMotion(damping);
  }, [damping, springConfig]);

  // Always render `TooltipBox` so it can play its exit fade; while hidden it
  // keeps the last panel mounted inside `AnimatePresence`.
  return (
    <TooltipBox
      animate={!instant && boxMotion.animate}
      backgroundColor={backgroundColor}
      className={className}
      containerHeight={height}
      containerRef={containerRef}
      containerWidth={width}
      entrance={!instant}
      exit={!instant}
      panelStyle={panelStyle}
      springConfig={boxMotion.springConfig}
      visible={displayData !== null}
      x={displayData?.x ?? 0}
      y={displayData?.y ?? 0}
    >
      {displayData && (
        <>
          <TooltipHeader>
            {formatHeatmapTooltipDate(displayData.date)}
            <div className="mt-0.5 font-normal text-chart-tooltip-muted text-xs">
              {formatHeatmapTooltipWeekday(displayData.date)}
            </div>
          </TooltipHeader>
          <div className="px-3.5 py-3 text-left text-chart-tooltip-foreground text-sm">
            {formatLabel(displayData.count, displayData.date)}
          </div>
        </>
      )}
    </TooltipBox>
  );
});

HeatmapTooltip.displayName = "HeatmapTooltip";

export default HeatmapTooltip;
