import React from 'react';
import { TouchableOpacity, View } from 'react-native';

export type ContributionState = 'Completed' | 'Missed' | 'MissedExpired' | 'Frozen' | 'Future' | 'Not scheduled' | 'Pad';

interface ContributionDayProps {
  dateStr?: string;
  state: ContributionState;
  isSelected?: boolean;
  selectable?: boolean;
  onPress?: () => void;
}

export const ContributionDay: React.FC<ContributionDayProps> = ({
  dateStr,
  state,
  isSelected = false,
  selectable = true,
  onPress,
}) => {
  // Filler padding cell
  if (state === 'Pad' || !dateStr) {
    return <View style={{ width: 12, height: 12, margin: 1.5 }} />;
  }

  // Get style attributes for each state strictly based on design system tokens
  const getCellStyles = () => {
    switch (state) {
      case 'Completed':
        return {
          backgroundColor: '#E8C08A', // gold
          borderWidth: 0,
        };
      case 'Missed':
        return {
          backgroundColor: '#E8899A', // bright pink (eligible)
          borderWidth: 0,
        };
      case 'MissedExpired':
        return {
          backgroundColor: '#3A2328', // muted desaturated rose fill
          borderWidth: 1,
          borderColor: '#5A383F', // muted border
        };
      case 'Frozen':
        return {
          backgroundColor: '#38BDF8', // Sky Blue fill
          borderWidth: 0,
        };
      case 'Future':
        return {
          backgroundColor: '#1E1A17', // disabled/future fill
          borderWidth: 0,
        };
      case 'Not scheduled':
      default:
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#2B2521', // border
        };
    }
  };

  const cellStyle = getCellStyles();
  const isClickable = selectable && state !== 'Future' && state !== 'MissedExpired' && onPress;

  return (
    <TouchableOpacity
      activeOpacity={isClickable ? 0.7 : 1}
      onPress={isClickable ? onPress : undefined}
      disabled={!isClickable}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityLabel={dateStr ? `${dateStr}, ${state}` : undefined}
      accessibilityRole={isClickable ? 'button' : 'none'}
      style={{
        margin: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={[
          {
            width: 12,
            height: 12,
            borderRadius: 2.5,
            ...cellStyle,
          },
          isSelected && {
            borderWidth: 1.5,
            borderColor: '#F5F2EC',
          },
        ]}
      />
    </TouchableOpacity>
  );
};
