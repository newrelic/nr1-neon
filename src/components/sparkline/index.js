import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { useNrqlQuery } from 'nr1';

const PAD = 4; // vertical padding in SVG units to keep the line from touching the top/bottom edges
const W = 100; // viewBox width in SVG units; using 100 makes svgX values equal percentages, simplifying HTML overlay positioning

function buildPaths(pts, height) {
  let linePath = '';
  let areaStart = null;
  let areaEnd = null;

  pts.forEach((p) => {
    if (p.svgY == null) return;
    if (!linePath) {
      linePath = `M${p.svgX.toFixed(2)} ${p.svgY.toFixed(2)}`;
      areaStart = p;
    } else {
      linePath += ` L${p.svgX.toFixed(2)} ${p.svgY.toFixed(2)}`;
    }
    areaEnd = p;
  });

  const areaPath =
    areaStart && areaEnd
      ? `${linePath} L${areaEnd.svgX.toFixed(
          2
        )} ${height} L${areaStart.svgX.toFixed(2)} ${height}Z`
      : '';

  return { linePath, areaPath };
}

function formatValue(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toPrecision(3);
}

const Sparkline = ({ accountId, query, height = 44 }) => {
  const { data, loading } = useNrqlQuery({ accountIds: [accountId], query });

  const pts = useMemo(() => {
    const series = data?.[0]?.data;
    if (!series?.length) return [];
    const vals = series.map((d) => d.y).filter((y) => y != null);
    if (!vals.length) return [];
    const minY = Math.min(...vals);
    const maxY = Math.max(...vals);
    const yRange = maxY - minY || 1; // guard against division by zero when all values are identical (flat line)
    return series.map((d, i) => ({
      svgX: (i / (series.length - 1)) * W,
      svgY:
        d.y == null
          ? null
          : height - PAD - ((d.y - minY) / yRange) * (height - PAD * 2),
      y: d.y,
    }));
  }, [data, height]);

  if (loading) return <div className="sparkline loading" style={{ height }} />;
  if (!pts.length)
    return (
      <div className="sparkline empty" style={{ height }}>
        —
      </div>
    );

  return <SparklineSvg pts={pts} height={height} />;
};

const SparklineSvg = ({ pts, height }) => {
  const [hover, setHover] = useState(null);
  const { linePath, areaPath } = useMemo(
    () => buildPaths(pts, height),
    [pts, height]
  );

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = null;
    let minDist = Infinity;
    pts.forEach((p) => {
      if (p.svgY == null) return;
      const dist = Math.abs(p.svgX - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });
    setHover(closest);
  };

  const tooltipLeft = hover ? Math.min(Math.max(hover.svgX, 5), 95) : 0; // clamp so the tooltip never overflows the container edges

  return (
    <div
      className="sparkline"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* preserveAspectRatio="none" lets the SVG stretch freely to fill the container, which is correct for a sparkline */}
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {areaPath && <path d={areaPath} className="area" />}
        <path d={linePath} className="line" />
        {hover && (
          <line
            x1={hover.svgX}
            y1={0}
            x2={hover.svgX}
            y2={height}
            className="cursor"
          />
        )}
      </svg>
      {hover && (
        <>
          <span
            className="dot"
            style={{
              left: `${hover.svgX}%`,
              top: `${(hover.svgY / height) * 100}%`,
            }}
          />
          <span className="tooltip" style={{ left: `${tooltipLeft}%` }}>
            {formatValue(hover.y)}
          </span>
        </>
      )}
    </div>
  );
};

SparklineSvg.propTypes = {
  pts: PropTypes.array,
  height: PropTypes.number,
};

Sparkline.propTypes = {
  accountId: PropTypes.number,
  query: PropTypes.string,
  height: PropTypes.number,
};

export default Sparkline;
