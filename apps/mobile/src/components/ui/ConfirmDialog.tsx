import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <TouchableWithoutFeedback onPress={onCancel}>
          <View className="absolute inset-0" />
        </TouchableWithoutFeedback>

        <View className="w-full bg-[#181513] border border-[#2B2521] rounded-2xl p-6 shadow-2xl max-w-sm">
          <Text className="text-xl font-bold text-[#F5F2EC] mb-2" style={{ fontFamily: 'Baloo 2' }}>
            {title}
          </Text>
          <Text className="text-sm text-[#9C958C] leading-relaxed mb-6">
            {message}
          </Text>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-3 bg-[#221C16] border border-[#3A2E1F] rounded-xl items-center justify-center mr-2"
            >
              <Text className="text-sm font-semibold text-[#9C958C]">{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 py-3 rounded-xl items-center justify-center ml-2 ${
                destructive ? 'bg-[#3A1C1C] border border-[#E8899A]/40' : 'bg-[#E8C08A]'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  destructive ? 'text-[#E8899A]' : 'text-[#241C14]'
                }`}
              >
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
