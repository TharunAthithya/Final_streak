import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { HabitResponse } from '@streak/contracts';
import { isHabitScheduledForDate, normalizeToLocalMidnight, toLocalDateString } from '../../utils/streak';
import { validateFreeze } from '../../utils/freeze';
import { ContributionDay, ContributionState } from './ContributionDay';

interface HabitContributionGraphProps {
  habit: HabitResponse;
  selectableStates?: ContributionState[];
  selectedDate?: string | null;
  onSelectDay?: (day: { dateStr: string; state: ContributionState; rawDate: Date }) => void;
  showLegend?: boolean;
}

export interface DayCellData {
  dateStr?: string;
  state: ContributionState;
  rawDate?: Date;
}

export const HabitContributionGraph: React.FC<HabitContributionGraphProps> = ({
  habit,
  selectableStates = ['Completed', 'Missed', 'Frozen', 'Not scheduled'],
  selectedDate,
  onSelectDay,
  showLegend = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll to rightmost (today's) edge on render
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [habit.id, habit.checkIns?.length]);

  const todayMidnight = normalizeToLocalMidnight(new Date());
  const todayStr = toLocalDateString(todayMidnight);

  // 1. Resolve start date & end date
  const startRaw = habit.createdAt || habit.startDate || todayStr;
  const startMidnight = normalizeToLocalMidnight(startRaw);

  // 2. Build map of check-ins
  const checkInMap = new Map<string, string>();
  if (habit.checkIns) {
    for (const c of habit.checkIns) {
      checkInMap.set(c.localDate, c.status || 'COMPLETED');
    }
  }

  // 3. Build chronological list of days from startDate to today
  const dayList: DayCellData[] = [];
  const curr = new Date(startMidnight);

  while (curr <= todayMidnight) {
    const dateStr = toLocalDateString(curr);
    const isFuture = curr > todayMidnight;
    const checkInStatus = checkInMap.get(dateStr);

    let state: ContributionState;

    // Priority Order (per spec):
    // 1. Frozen
    // 2. Completed
    // 3. Future
    // 4. Missed (Eligible vs Expired via shared validateFreeze service)
    // 5. Not scheduled
    if (checkInStatus === 'FREEZE') {
      state = 'Frozen';
    } else if (checkInStatus === 'COMPLETED') {
      state = 'Completed';
    } else if (isFuture) {
      state = 'Future';
    } else if (isHabitScheduledForDate(habit, curr)) {
      const freezeCheck = validateFreeze(habit, dateStr, todayMidnight);
      if (freezeCheck.valid) {
        state = 'Missed';
      } else {
        state = 'MissedExpired';
      }
    } else {
      state = 'Not scheduled';
    }

    dayList.push({
      dateStr,
      state,
      rawDate: new Date(curr),
    });

    curr.setDate(curr.getDate() + 1);
  }

  // Handle edge case of 0 days
  if (dayList.length === 0) {
    const isSched = isHabitScheduledForDate(habit, todayMidnight);
    let defaultState: ContributionState = 'Not scheduled';
    if (isSched) {
      const freezeCheck = validateFreeze(habit, todayStr, todayMidnight);
      defaultState = freezeCheck.valid ? 'Missed' : 'MissedExpired';
    }
    dayList.push({
      dateStr: todayStr,
      state: defaultState,
      rawDate: todayMidnight,
    });
  }

  // 4. Calculate grid dimensions for Monday-start alignment
  const startDayOfWeek = (startMidnight.getDay() + 6) % 7;
  const leadingPad = startDayOfWeek;
  const totalDays = dayList.length;
  const totalCells = leadingPad + totalDays;
  const weeks = Math.max(1, Math.ceil(totalCells / 7));

  // Construct column-major matrix (weeks columns x 7 rows Mon..Sun)
  const columns: DayCellData[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCellData[] = [];
    for (let r = 0; r < 7; r++) {
      const cellIndex = w * 7 + r;
      const dayIndex = cellIndex - leadingPad;

      if (cellIndex < leadingPad || dayIndex >= totalDays) {
        col.push({ state: 'Pad' });
      } else {
        col.push(dayList[dayIndex]);
      }
    }
    columns.push(col);
  }

  const rowLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-4">
      <View className="flex-row items-start">
        {/* Row Header Labels (Mon..Sun) */}
        <View className="mr-2 justify-between" style={{ height: 7 * 15 }}>
          {rowLabels.map((lbl, idx) => (
            <View key={idx} style={{ height: 12, justifyContent: 'center' }}>
              <Text className="text-[10px] font-bold text-[#65605A]">{lbl}</Text>
            </View>
          ))}
        </View>

        {/* Scrollable Contribution Matrix */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingRight: 4 }}
        >
          <View className="flex-row">
            {columns.map((col, colIdx) => (
              <View key={colIdx} className="flex-col">
                {col.map((cell, rowIdx) => {
                  const isSelectable =
                    cell.state !== 'Pad' &&
                    cell.state !== 'Future' &&
                    cell.state !== 'MissedExpired' &&
                    selectableStates.includes(cell.state);

                  const isSelected = cell.dateStr ? cell.dateStr === selectedDate : false;

                  return (
                    <ContributionDay
                      key={rowIdx}
                      dateStr={cell.dateStr}
                      state={cell.state}
                      isSelected={isSelected}
                      selectable={isSelectable}
                      onPress={() => {
                        if (isSelectable && cell.dateStr && cell.rawDate && onSelectDay) {
                          onSelectDay({
                            dateStr: cell.dateStr,
                            state: cell.state,
                            rawDate: cell.rawDate,
                          });
                        }
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Freeze Calendar Legend */}
      {showLegend && (
        <View className="flex-row flex-wrap items-center justify-between pt-3 mt-3 border-t border-[#2B2521]">
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] bg-[#E8C08A] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Completed</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] bg-[#E8899A] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Freeze Available</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] bg-[#38BDF8] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Frozen</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] bg-[#3A2328] border border-[#5A383F] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Expired</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] bg-[#1E1A17] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Future</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <View className="w-2.5 h-2.5 rounded-[2px] border border-[#2B2521] mr-1.5" />
            <Text className="text-[10px] text-[#9C958C]">Rest</Text>
          </View>
        </View>
      )}
    </View>
  );
};
