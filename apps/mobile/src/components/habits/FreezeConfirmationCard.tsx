import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';
import { DotPulse } from '../ui/DotPulse';

interface FreezeConfirmationCardProps {
  selectedDateStr: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const FreezeConfirmationCard: React.FC<FreezeConfirmationCardProps> = ({
  selectedDateStr,
  onCancel,
  onConfirm,
  loading = false,
}) => {
  // Format YYYY-MM-DD to e.g. "Monday, Jul 20"
  const formatDateStr = (str: string) => {
    const parts = str.split('-');
    if (parts.length !== 3) return str;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mt-4">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 rounded-full bg-[#112A38] border border-[#38BDF8]/40 items-center justify-center mr-3">
          <Icon name="snowflake" size={16} color="#38BDF8" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-[#F5F2EC]">
            Use one Freeze for {formatDateStr(selectedDateStr)}
          </Text>
          <Text className="text-xs text-[#9C958C]">
            This will restore your streak.
          </Text>
        </View>
      </View>

      <View className="flex-row space-x-3 mt-2">
        <TouchableOpacity
          onPress={onCancel}
          disabled={loading}
          className="flex-1 py-3 bg-[#221C16] border border-[#2B2521] rounded-xl items-center justify-center mr-1.5"
        >
          <Text className="text-xs font-semibold text-[#9C958C]">Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onConfirm}
          disabled={loading}
          className="flex-1 py-3 bg-[#E8C08A] rounded-xl items-center justify-center ml-1.5 flex-row"
        >
          {loading ? (
            <DotPulse color="#241C14" size={5} />
          ) : (
            <>
              <Icon name="check" size={14} color="#241C14" className="mr-1.5" />
              <Text className="text-xs font-bold text-[#241C14]">Use Freeze</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
