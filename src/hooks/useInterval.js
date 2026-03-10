import { useEffect, useRef } from 'react';

/**
 * Custom hook لتنفيذ callback على فترات منتظمة
 * @param {Function} callback - الدالة المنفذة
 * @param {number|null} delay - الفترة بالملي ثانية (إذا null يتوقف)
 */
export const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // حفظ أحدث callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // إعداد interval
  useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

export default useInterval;
