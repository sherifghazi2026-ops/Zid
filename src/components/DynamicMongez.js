import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MongezChat, { MongezButton } from './Mongez';
import { getAssistantsForScreen } from '../services/assistantService';

export default function DynamicMongez({ screen, navigation, contextData = {} }) {
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const screenRef = useRef(screen);
  const loadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    // تحميل المساعدين مرة واحدة فقط
    if (!loadedRef.current) {
      loadAssistants();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []); // مصفوفة فارغة - يشتغل مرة واحدة فقط عند تحميل المكون

  // لا نستخدم useEffect مع screen لأننا لا نريد إعادة التحميل

  const loadAssistants = async () => {
    if (!mountedRef.current || loadedRef.current) return;
    
    setLoading(true);
    
    try {
      const result = await getAssistantsForScreen(screen);
      
      if (!mountedRef.current) return;
      
      if (result.success) {
        setAssistants(result.data);
        loadedRef.current = true; // نضع علامة أنه تم التحميل
      } else {
        setAssistants([]);
      }
    } catch (error) {
      console.log('خطأ في تحميل المساعدين:', error);
      if (mountedRef.current) {
        setAssistants([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
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
