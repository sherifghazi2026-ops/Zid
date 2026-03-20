import React from 'react';
import Mongez from './Mongez';

export default function DynamicMongez({ screen, navigation, contextData = {} }) {
  // التحقق من وجود المساعد للشاشة الحالية
  const shouldShow = React.useMemo(() => {
    // يمكن إضافة منطق هنا لتفعيل/تعطيل المساعد حسب الشاشة
    return true;
  }, [screen]);

  if (!shouldShow) return null;

  return (
    <Mongez
      screen={screen}
      navigation={navigation}
      contextData={contextData}
    />
  );
}
