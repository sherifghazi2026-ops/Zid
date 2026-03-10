import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MongezChat, { MongezButton } from './Mongez';
import { getAssistantsForScreen } from '../services/assistantService';

export default function DynamicMongez({ screen, navigation, contextData = {} }) {
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssistants();
  }, [screen]);

  const loadAssistants = async () => {
    setLoading(true);
    
    // نجيب المساعدين للشاشة الحالية
    const result = await getAssistantsForScreen(screen);
    if (result.success) {
      setAssistants(result.data);
    }
    
    setLoading(false);
  };

  const openAssistant = (assistant) => {
    setSelectedAssistant(assistant);
  };

  const closeAssistant = () => {
    setSelectedAssistant(null);
  };

  if (loading || assistants.length === 0 || !navigation) {
    return null;
  }

  // تجميع الأزرار حسب المواقع
  const buttonsByPosition = {
    'bottom-right': [],
    'bottom-left': [],
    'bottom-center': []
  };

  assistants.forEach(assistant => {
    const position = assistant.position || 'bottom-right';
    if (buttonsByPosition[position]) {
      buttonsByPosition[position].push(assistant);
    }
  });

  return (
    <>
      {Object.entries(buttonsByPosition).map(([position, positionAssistants]) => 
        positionAssistants.length > 0 && (
          <View key={position} style={[styles.container, styles[position]]}>
            {positionAssistants.map((assistant, index) => (
              <View key={assistant.$id} style={index > 0 ? styles.buttonSpacing : null}>
                <MongezButton
                  title={assistant.name}
                  icon={assistant.icon}
                  color={assistant.color}
                  onPress={() => openAssistant(assistant)}
                />
              </View>
            ))}
          </View>
        )
      )}

      {selectedAssistant && navigation && (
        <MongezChat
          visible={!!selectedAssistant}
          onClose={closeAssistant}
          assistant={selectedAssistant}
          navigation={navigation}
          contextData={contextData}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  'bottom-right': {
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  'bottom-left': {
    bottom: 20,
    left: 20,
    alignItems: 'flex-start',
  },
  'bottom-center': {
    bottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    left: 0,
    right: 0,
  },
  buttonSpacing: {
    marginTop: 10,
  },
});
