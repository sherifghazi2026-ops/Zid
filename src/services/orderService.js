import { databases, DATABASE_ID, ORDERS_COLLECTION_ID } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { playNotificationSound } from '../utils/SoundHelper';
import { getUsersByRoleAndType } from '../appwrite/userService';

export const SERVICE_TYPES = {
  GROCERY: 'supermarket',
  RESTAURANT: 'restaurant',
  PHARMACY: 'pharmacy',
  IRONING: 'ironing',
  KITCHEN: 'kitchen',
  WINCH: 'winch',
  ELECTRICIAN: 'electrician',
  MOVING: 'moving',
  MARBLE: 'marble',
  PLUMBING: 'plumbing',
  CARPENTRY: 'carpentry',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

let notificationLock = false;

export const uploadFile = async (uri, fileName, type = 'voice') => {
  try {
    const { uploadToImageKit } = await import('./uploadService');
    const startTime = Date.now();

    console.log(`⏱️ بدء رفع ${type === 'voice' ? 'الصوت' : 'الصورة'} في:`, new Date().toLocaleTimeString());

    const result = await uploadToImageKit(uri, fileName, type);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`⏱️ انتهى الرفع بعد ${duration.toFixed(1)} ثانية`);

    if (result.success && result.fileUrl) {
      console.log(`✅ رابط ${type === 'voice' ? 'الصوت' : 'الصورة'} جاهز:`, result.fileUrl);
      return { success: true, fileUrl: result.fileUrl, type };
    }
    return { success: false, error: result.error || 'فشل الرفع', type };
  } catch (error) {
    console.error(`❌ خطأ في رفع ${type}:`, error);
    return { success: false, error: error.message, type };
  }
};

const notifyMerchants = async (serviceType, orderData) => {
  try {
    console.log(`🔔 جلب التجار للخدمة: ${serviceType}`);
    const result = await getUsersByRoleAndType('merchant', serviceType);
    if (result.success && result.data.length > 0) {
      console.log(`✅ تم العثور على ${result.data.length} تاجر للخدمة ${serviceType}`);

      if (!notificationLock) {
        notificationLock = true;
        await playNotificationSound();
        setTimeout(() => { notificationLock = false; }, 20000);
      }

      return { success: true, merchantsCount: result.data.length };
    } else {
      console.log(`⚠️ لا يوجد تجار متاحون للخدمة ${serviceType}`);
      return { success: true, merchantsCount: 0 };
    }
  } catch (error) {
    console.error('❌ خطأ في إشعار التجار:', error);
    return { success: false, error: error.message };
  }
};

const notifyDrivers = async (serviceType, orderData) => {
  try {
    console.log(`🔔 جلب المناديب للخدمة: ${serviceType}`);
    const result = await getUsersByRoleAndType('driver', serviceType);
    if (result.success && result.data.length > 0) {
      console.log(`✅ تم العثور على ${result.data.length} مندوب للخدمة ${serviceType}`);

      if (!notificationLock) {
        notificationLock = true;
        await playNotificationSound();
        setTimeout(() => { notificationLock = false; }, 20000);
      }

      return { success: true, driversCount: result.data.length };
    } else {
      console.log(`⚠️ لا يوجد مناديب متاحون للخدمة ${serviceType}`);
      return { success: true, driversCount: 0 };
    }
  } catch (error) {
    console.error('❌ خطأ في إشعار المناديب:', error);
    return { success: false, error: error.message };
  }
};

export const createOrder = async (orderData) => {
  try {
    console.log('📝 إنشاء طلب جديد:', orderData.serviceName);
    console.log('🔊 رابط الصوت:', orderData.voiceUrl);
    console.log('🖼️ عدد الصور:', orderData.imageUrls?.length || 0);

    const order = {
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      serviceType: orderData.serviceType,
      serviceName: orderData.serviceName,
      items: orderData.items || [],
      description: orderData.description || '',
      rawText: orderData.rawText || '',
      status: ORDER_STATUS.PENDING,
      paymentMethod: orderData.paymentMethod || 'cash',
      totalPrice: Number(orderData.totalPrice) || 0,
      deliveryFee: Number(orderData.deliveryFee) || 0,
      finalTotal: (Number(orderData.totalPrice) || 0) + (Number(orderData.deliveryFee) || 0),
      voiceUrl: orderData.voiceUrl || null,
      imageUrls: orderData.imageUrls || [],
      notes: orderData.notes || '',
      merchantId: null,
      merchantName: null,
      merchantPhone: null,
      driverId: null,
      driverName: null,
      driverPhone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('🚀 إرسال البيانات إلى Appwrite...');

    const response = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      order
    );

    console.log('⭐ تم إنشاء الطلب بنجاح برقم:', response.$id);
    console.log('🔊 رابط الصوت المحفوظ:', response.voiceUrl);

    await Promise.all([
      notifyMerchants(orderData.serviceType, order),
      notifyDrivers(orderData.serviceType, order)
    ]);

    return { success: true, data: response };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    return { success: false, error: error.message };
  }
};

export const getOrders = async (filters = {}) => {
  try {
    const queries = [];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queries.push(Query.equal('status', filters.status));
      } else {
        queries.push(Query.equal('status', filters.status));
      }
    }
    if (filters.serviceType) {
      queries.push(Query.equal('serviceType', filters.serviceType));
    }
    if (filters.customerPhone) {
      queries.push(Query.equal('customerPhone', filters.customerPhone));
    }
    if (filters.merchantId) {
      queries.push(Query.equal('merchantId', filters.merchantId));
    }
    if (filters.driverId) {
      queries.push(Query.equal('driverId', filters.driverId));
    }

    queries.push(Query.orderDesc('createdAt'));

    const response = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      queries
    );

    return { success: true, data: response.documents };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    };

    const response = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      updateData
    );

    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
};

export const acceptOrder = async (orderId, merchantId, merchantName, merchantPhone) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED, {
    merchantId,
    merchantName,
    merchantPhone,
    acceptedAt: new Date().toISOString()
  });
};

export const setOrderPrice = async (orderId, totalPrice, deliveryFee = 0) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED, {
    totalPrice,
    deliveryFee,
    finalTotal: totalPrice + deliveryFee,
    priceSetAt: new Date().toISOString()
  });
};

export const assignDriver = async (orderId, driverId, driverName, driverPhone) => {
  return updateOrderStatus(orderId, ORDER_STATUS.PREPARING, {
    driverId,
    driverName,
    driverPhone,
    assignedAt: new Date().toISOString()
  });
};

export const startDelivery = async (orderId) => {
  return updateOrderStatus(orderId, ORDER_STATUS.ON_THE_WAY);
};

export const completeDelivery = async (orderId) => {
  return updateOrderStatus(orderId, ORDER_STATUS.DELIVERED, {
    deliveredAt: new Date().toISOString()
  });
};

export const cancelOrder = async (orderId, reason) => {
  return updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, {
    cancellationReason: reason
  });
};

export const deleteOrder = async (orderId) => {
  try {
    await databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
