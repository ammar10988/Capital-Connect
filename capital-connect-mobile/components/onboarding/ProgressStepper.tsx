import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  steps: string[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: Props) {
  return (
    <View style={styles.container}>
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  !isCompleted && !isActive && styles.circleInactive,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark-outline" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.circleNumber,
                      isActive && styles.circleNumberActive,
                      !isCompleted && !isActive && styles.circleNumberInactive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                  !isActive && !isCompleted && styles.labelInactive,
                ]}
              >
                {label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.line,
                  index < currentStep ? styles.lineCompleted : styles.lineRemaining,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stepWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: '#22C55E',
  },
  circleActive: {
    backgroundColor: '#2563EB',
  },
  circleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  circleNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  circleNumberActive: {
    color: '#FFFFFF',
  },
  circleNumberInactive: {
    color: '#9CA3AF',
  },
  label: {
    fontSize: 11,
  },
  labelActive: {
    color: '#2563EB',
  },
  labelCompleted: {
    color: '#22C55E',
  },
  labelInactive: {
    color: '#6B7280',
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 13,
    marginHorizontal: 2,
  },
  lineCompleted: {
    backgroundColor: '#22C55E',
  },
  lineRemaining: {
    backgroundColor: '#D1D5DB',
  },
});
