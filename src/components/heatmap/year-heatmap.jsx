  "use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { formatISO, subDays, format, startOfWeek, addDays, getMonth } from "date-fns";

function intensityClass(rate) {
  if (!rate || rate <= 0) return "bg-zinc-700/80";
  if (rate < 0.25) return "bg-green-500/60 dark:bg-green-500/55";
  if (rate < 0.5) return "bg-green-500/75 dark:bg-green-500/70";
  if (rate < 0.75) return "bg-green-500/90 dark:bg-green-500/85";
  return "bg-green-500";
}

export default function YearHeatmap({ daily }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for responsive sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const map = useMemo(() => {
    const m = new Map();
    for (const d of daily) m.set(d.date, d.completionRate);
    return m;
  }, [daily]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const oneYearAgo = subDays(today, 364);
    const startDate = startOfWeek(oneYearAgo, { weekStartsOn: 0 });
    
    const allWeeks = [];
    let currentWeek = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const ymd = formatISO(currentDate, { representation: "date" });
      const dayOfWeek = currentDate.getDay();
      const month = getMonth(currentDate);
      const year = currentDate.getFullYear();
      const isBeforeStart = currentDate < oneYearAgo;
      
      currentWeek.push({
        ymd,
        dow: dayOfWeek,
        rate: isBeforeStart ? null : (map.get(ymd) || 0),
        monthName: format(currentDate, "MMM"),
        monthNum: month,
        year,
        isPlaceholder: isBeforeStart,
      });
      
      if (dayOfWeek === 6) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          ymd: null,
          dow: currentWeek.length,
          rate: null,
          isPlaceholder: true,
        });
      }
      allWeeks.push(currentWeek);
    }

    const labels = [];
    let lastMonthKey = "";
    
    allWeeks.forEach((week, weekIndex) => {
      const firstValidDay = week.find(d => !d.isPlaceholder && d.monthNum !== undefined);
      if (firstValidDay) {
        const monthKey = `${firstValidDay.year}-${firstValidDay.monthNum}`;
        if (monthKey !== lastMonthKey) {
          labels.push({ 
            name: firstValidDay.monthName,
            weekIndex,
            key: monthKey,
          });
          lastMonthKey = monthKey;
        }
      }
    });
    
    return { weeks: allWeeks, monthLabels: labels };
  }, [map]);

  const totalDays = useMemo(() => {
    let count = 0;
    weeks.forEach(week => {
      week.forEach(day => {
        if (!day.isPlaceholder && day.rate > 0) count++;
      });
    });
    return count;
  }, [weeks]);

  const avgCompletion = useMemo(() => {
    let sum = 0;
    let count = 0;
    weeks.forEach(week => {
      week.forEach(day => {
        if (!day.isPlaceholder && day.rate !== null) {
          sum += day.rate;
          count++;
        }
      });
    });
    return count > 0 ? Math.round((sum / count) * 100) : 0;
  }, [weeks]);

  // Responsive cell size calculation
  const dayLabelWidth = containerWidth < 640 ? 0 : 28;
  const availableWidth = containerWidth - dayLabelWidth - 8;
  const numWeeks = weeks.length;
  
  // Calculate cell size to fit container, with min/max bounds
  const calculatedCellSize = Math.floor((availableWidth - (numWeeks - 1) * 2) / numWeeks);
  const cellSize = Math.max(8, Math.min(14, calculatedCellSize));
  const cellGap = cellSize > 10 ? 3 : 2;
  const cellTotal = cellSize + cellGap;

  // Calculate grid dimensions
  const gridWidth = numWeeks * cellSize + (numWeeks - 1) * cellGap;
  const gridHeight = 7 * cellSize + 6 * cellGap;

  return (
    <div className="space-y-3 w-full" ref={containerRef}>
      {/* Stats */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{totalDays}</span> active days
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{avgCompletion}%</span> avg completion
          </span>
        </div>
      </div>

      {/* Heatmap Container - Full width */}
      {containerWidth > 0 && (
        <div className="w-full">
          {/* Month labels row */}
          <div 
            className="flex text-[10px] sm:text-xs text-muted-foreground mb-1"
            style={{ paddingLeft: `${dayLabelWidth}px` }}
          >
            {monthLabels.map(({ name, weekIndex, key }, i) => {
              const nextLabel = monthLabels[i + 1];
              const startPos = weekIndex * cellTotal;
              const endPos = nextLabel 
                ? nextLabel.weekIndex * cellTotal 
                : numWeeks * cellTotal;
              const width = endPos - startPos;
              
              return (
                <div 
                  key={key}
                  className="font-medium truncate"
                  style={{ 
                    width: `${width}px`,
                    minWidth: `${width}px`,
                  }}
                >
                  {width > (cellSize * 2) ? name : ''}
                </div>
              );
            })}
          </div>

          {/* Grid container */}
          <div className="flex">
            {/* Day labels column - hidden on small screens */}
            {dayLabelWidth > 0 && (
              <div 
                className="hidden sm:flex flex-col text-[9px] text-muted-foreground shrink-0 pr-1"
                style={{ 
                  width: `${dayLabelWidth}px`,
                  gap: `${cellGap}px`,
                }}
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                  <div 
                    key={day}
                    className="flex items-center justify-end"
                    style={{ height: `${cellSize}px` }}
                  >
                    <span className="opacity-60">
                      {i % 2 === 1 ? day : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Weeks grid */}
            <div 
              className="flex flex-1"
              style={{ gap: `${cellGap}px` }}
            >
              {weeks.map((week, wi) => (
                <div 
                  key={wi} 
                  className="flex flex-col"
                  style={{ gap: `${cellGap}px` }}
                >
                  {week.map((day, di) => {
                    if (day.isPlaceholder) {
                      return (
                        <div 
                          key={di} 
                          style={{ 
                            width: `${cellSize}px`, 
                            height: `${cellSize}px` 
                          }} 
                        />
                      );
                    }
                    
                    const percentage = Math.round((day.rate || 0) * 100);
                    const dateStr = day.ymd ? format(new Date(day.ymd), "MMM d, yyyy") : '';
                    
                    return (
                      <div
                        key={day.ymd || di}
                        className={`
                          rounded-[2px] cursor-pointer transition-all duration-150
                          hover:ring-1 sm:hover:ring-2 hover:ring-green-400/70 
                          hover:ring-offset-1 hover:ring-offset-background
                          ${intensityClass(day.rate)}
                        `}
                        style={{ 
                          width: `${cellSize}px`, 
                          height: `${cellSize}px` 
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            date: dateStr,
                            rate: percentage,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onTouchStart={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            date: dateStr,
                            rate: percentage,
                          });
                        }}
                        onTouchEnd={() => setTimeout(() => setTooltip(null), 1500)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-50 px-2 py-1 text-[10px] sm:text-xs bg-popover border border-border rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full whitespace-nowrap"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
          }}
        >
          <div className="font-medium">{tooltip.date}</div>
          <div className="text-muted-foreground">{tooltip.rate}% completed</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex" style={{ gap: `${Math.max(cellGap - 1, 1)}px` }}>
          <div 
            className="rounded-[2px] bg-zinc-700/80" 
            style={{ width: `${Math.min(cellSize, 12)}px`, height: `${Math.min(cellSize, 12)}px` }}
          />
          <div 
            className="rounded-[2px] bg-green-500/60 dark:bg-green-500/55" 
            style={{ width: `${Math.min(cellSize, 12)}px`, height: `${Math.min(cellSize, 12)}px` }}
          />
          <div 
            className="rounded-[2px] bg-green-500/75 dark:bg-green-500/70" 
            style={{ width: `${Math.min(cellSize, 12)}px`, height: `${Math.min(cellSize, 12)}px` }}
          />
          <div 
            className="rounded-[2px] bg-green-500/90 dark:bg-green-500/85" 
            style={{ width: `${Math.min(cellSize, 12)}px`, height: `${Math.min(cellSize, 12)}px` }}
          />
          <div 
            className="rounded-[2px] bg-green-500" 
            style={{ width: `${Math.min(cellSize, 12)}px`, height: `${Math.min(cellSize, 12)}px` }}
          />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
